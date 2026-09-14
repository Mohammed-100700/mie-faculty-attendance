require('dotenv').config();

const mongoose = require('mongoose');

if (!process.env.MONGO_URI) {
  throw new Error('Aborting: MONGO_URI environment variable is required.');
}
if (!process.env.TARGET_DB_NAME || process.env.TARGET_DB_NAME.trim() === '') {
  throw new Error('Aborting: TARGET_DB_NAME environment variable is required.');
}
if (process.env.MIGRATE_STUDENTCHECKIN_INDEXES !== '1') {
  throw new Error('Aborting: MIGRATE_STUDENTCHECKIN_INDEXES must equal "1".');
}

(async () => {
  try {
    // 2. AWAIT DATABASE CONNECTION
    await mongoose.connect(process.env.MONGO_URI, {
      dbName: process.env.TARGET_DB_NAME,
      autoIndex: false,
    });

    // 3. VERIFY DATABASE NAME CORRECTLY
    const actualDbName =
      mongoose.connection.name ||
      mongoose.connection.db?.databaseName;
    console.log(`Connected to database: ${actualDbName}`);

    if (actualDbName !== process.env.TARGET_DB_NAME) {
      throw new Error(
        `Connected database name '${actualDbName}' does not match TARGET_DB_NAME '${process.env.TARGET_DB_NAME}'.`
      );
    }

    const collection = mongoose.connection.collection('studentcheckins');

    // 5. BUILD A SAFE INDEX STATE MACHINE
    const indexes = await collection.indexes();

    // Explicitly declared state variables
    let desiredLegacyIndex = null;
    let obsoleteLegacyIndex = null;
    let desiredLinkedIndex = null;

    // CLASSIFY LEGACY INDEXES by exact shape
    const legacyKey = { sessionId: 1, studentName: 1 };
    const linkedKey = { sessionId: 1, studentRef: 1 };

    for (const idx of indexes) {
      const keyStr = JSON.stringify(idx.key);
      const isUnique = idx.unique;
      const partialFilter = idx.partialFilterExpression;

      // LEGACY KEY: { sessionId: 1, studentName: 1 }
      if (keyStr === JSON.stringify(legacyKey)) {
        if (isUnique === true && partialFilter === undefined) {
          // OBSOLETE: unique, no partialFilterExpression
          if (obsoleteLegacyIndex === null) {
            obsoleteLegacyIndex = idx.name;
          } else {
            // More than one obsolete - throw
            throw new Error(
              'Aborting: More than one obsolete legacy same-key index found. Cannot guess which to drop.'
            );
          }
        } else if (isUnique === true && partialFilter !== undefined) {
          // DESIRED: unique with partialFilterExpression exactly { studentRef: null }
          const pfStr = JSON.stringify(partialFilter);
          if (pfStr === JSON.stringify({ studentRef: null })) {
            if (desiredLegacyIndex === null) {
              desiredLegacyIndex = idx.name;
            } else {
              // More than one desired - throw
              throw new Error(
                'Aborting: More than one desired legacy same-key index found.'
              );
            }
          } else {
            // Partial filter exists but wrong content - unexpected
            throw new Error(
              'Aborting: Unexpected legacy same-key index configuration.'
            );
          }
        } else {
          // unexpected: unique !== true or any other same-key configuration
          throw new Error(
            'Aborting: Unexpected legacy same-key index configuration.'
          );
        }
      }

      // LINKED KEY: { sessionId: 1, studentRef: 1 }
      if (keyStr === JSON.stringify(linkedKey)) {
        if (isUnique !== true) {
          throw new Error(
            'Aborting: Linked same-key index is not unique.'
          );
        }
        const pfStr = JSON.stringify(partialFilter);
        // DESIRED: partialFilterExpression exactly { studentRef: { $type: 'objectId' } }
        if (pfStr === JSON.stringify({ studentRef: { $type: 'objectId' } })) {
          if (desiredLinkedIndex === null) {
            desiredLinkedIndex = idx.name;
          } else {
            // More than one desired linked - throw
            throw new Error(
              'Aborting: More than one desired linked same-key index found.'
            );
          }
        } else if (pfStr === '{}' || pfStr === JSON.stringify({})) {
          // linked without partial filter - unexpected
          throw new Error(
            'Aborting: Unexpected linked index without partialFilterExpression.'
          );
        } else {
          // Any other partial filter content - unexpected
          throw new Error(
            'Aborting: Unexpected partialFilterExpression on linked same-key index.'
          );
        }
      }
    }

    // 7. PREFLIGHT: Check for duplicate legacy rows { studentRef: null }
    const legacyRows = await collection.aggregate([
      { $match: { studentRef: null } },
      {
        $group: {
          _id: { sessionId: '$sessionId', studentName: '$studentName' },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ]).toArray();

    if (legacyRows.length > 0) {
      throw new Error(
        'Aborting: Duplicate legacy rows found (studentRef: null) grouped by sessionId + studentName.\n' +
        'Found ' + legacyRows.length + ' duplicate groups. Fix before migrating.\n' +
        JSON.stringify(legacyRows.slice(0, 5), null, 2)
      );
    }

    // 5. LEGACY STATE MACHINE
    // - exactly one desired, zero obsolete: leave desired
    // - zero desired, exactly one obsolete: warn, drop, create desired
    // - exactly one desired, exactly one obsolete: warn, drop obsolete, keep desired
    // - zero desired, zero obsolete: create desired partial index

    if (desiredLegacyIndex && !obsoleteLegacyIndex) {
      // Desired already exists, obsolete absent - leave alone
      console.log('Correct partial legacy index already exists - leaving it alone.');
    } else if (!desiredLegacyIndex && obsoleteLegacyIndex) {
      // Desired absent, exactly one obsolete exists - warn, drop, create desired
      console.log(
        'WARNING: Attendance check-ins should be paused while replacing the legacy unique index.'
      );
      await collection.dropIndex(obsoleteLegacyIndex);
      console.log('Creating partial unique legacy index...');
      await collection.createIndex(
        { sessionId: 1, studentName: 1 },
        { unique: true, partialFilterExpression: { studentRef: null } }
      );
      console.log('Created partial unique legacy index.');
    } else if (desiredLegacyIndex && obsoleteLegacyIndex) {
      // Both exist - drop ONLY obsolete, keep desired
      console.log(
        'WARNING: Attendance check-ins should be paused while replacing the legacy unique index.'
      );
      await collection.dropIndex(obsoleteLegacyIndex);
      console.log('Dropped obsolete index, keeping correct partial index.');
    } else {
      // Neither desired nor obsolete exists - create desired partial index
      console.log(
        'WARNING: Attendance check-ins should be paused while replacing the legacy unique index.'
      );
      console.log('Creating partial unique legacy index...');
      await collection.createIndex(
        { sessionId: 1, studentName: 1 },
        { unique: true, partialFilterExpression: { studentRef: null } }
      );
      console.log('Created partial unique legacy index.');
    }

    // 6. LINKED INDEX STATE MACHINE
    // - exactly one desired, zero unexpected: leave untouched
    // - zero desired, zero unexpected: create desired linked index
    // - any unexpected: throw
    // - more than one desired: throw

    if (desiredLinkedIndex) {
      // exactly one desired exists and no unexpected -> leave untouched
      console.log('Correct linked partial index already exists - leaving it untouched.');
    } else {
      // Check if there are any unexpected same-key linked indexes
      const unexpectedLinked = indexes.find(
        (idx) =>
          JSON.stringify(idx.key) === JSON.stringify(linkedKey) &&
          idx.unique === true &&
          idx.partialFilterExpression !== undefined
      );
      if (unexpectedLinked) {
        throw new Error(
          'Aborting: Unexpected linked same-key index exists. Cannot drop it automatically.'
        );
      }
      // no desired, no unexpected -> create desired linked index
      console.log('Creating expected linked partial index...');
      await collection.createIndex(
        { sessionId: 1, studentRef: 1 },
        { unique: true, partialFilterExpression: { studentRef: { $type: 'objectId' } } }
      );
      console.log('Created expected linked partial index.');
    }

    // 8. POST-MIGRATION VERIFICATION MUST CHECK EXACT SHAPES
    const finalIndexes = await collection.indexes();

    // For legacy key require: exactly ONE same-key index, unique===true, partialFilterExpression exactly { studentRef: null }
    const legacyFinal = finalIndexes.filter(
      (idx) => JSON.stringify(idx.key) === JSON.stringify(legacyKey)
    );
    if (legacyFinal.length !== 1) {
      throw new Error(
        'FAILURE: Expected exactly 1 legacy same-key index after migration, found ' +
          legacyFinal.length + '!'
      );
    }
    const legacyFinalIdx = legacyFinal[0];
    if (legacyFinalIdx.unique !== true) {
      throw new Error(
        'FAILURE: Legacy same-key index is not unique!'
      );
    }
    const legacyPfStr = JSON.stringify(legacyFinalIdx.partialFilterExpression);
    if (legacyPfStr !== JSON.stringify({ studentRef: null })) {
      throw new Error(
        'FAILURE: Legacy partialFilterExpression is not exactly { studentRef: null }, found: ' + legacyPfStr
      );
    }

    // For linked key require: exactly ONE same-key index, unique===true, partialFilterExpression exactly { studentRef: { $type: 'objectId' } }
    const linkedFinal = finalIndexes.filter(
      (idx) => JSON.stringify(idx.key) === JSON.stringify(linkedKey)
    );
    if (linkedFinal.length !== 1) {
      throw new Error(
        'FAILURE: Expected exactly 1 linked same-key index after migration, found ' +
          linkedFinal.length + '!'
      );
    }
    const linkedFinalIdx = linkedFinal[0];
    if (linkedFinalIdx.unique !== true) {
      throw new Error(
        'FAILURE: Linked same-key index is not unique!'
      );
    }
    const linkedPfStr = JSON.stringify(linkedFinalIdx.partialFilterExpression);
    if (linkedPfStr !== JSON.stringify({ studentRef: { $type: 'objectId' } })) {
      throw new Error(
        'FAILURE: Linked partialFilterExpression is not exactly { studentRef: { $type: \'objectId\' } }, found: ' + linkedPfStr
      );
    }

    // Verify no unexpected same-key legacy indexes
    const unexpectedLegacyFinal = finalIndexes.filter(
      (idx) =>
        JSON.stringify(idx.key) === JSON.stringify(legacyKey) &&
        (idx.unique !== true || idx.partialFilterExpression === undefined)
    );
    if (unexpectedLegacyFinal.length > 0) {
      throw new Error(
        'FAILURE: Found ' +
          unexpectedLegacyFinal.length +
          ' unexpected same-key legacy indexes after migration!'
      );
    }

    // Verify no unexpected same-key linked indexes
    const unexpectedLinkedFinal = finalIndexes.filter(
      (idx) =>
        JSON.stringify(idx.key) === JSON.stringify(linkedKey) &&
        (idx.unique !== true || idx.partialFilterExpression === undefined)
    );
    if (unexpectedLinkedFinal.length > 0) {
      throw new Error(
        'FAILURE: Found ' +
          unexpectedLinkedFinal.length +
          ' unexpected same-key linked indexes after migration!'
      );
    }

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration error:', error.message);
    process.exitCode = 1;
  } finally {
    // 7. CLEANUP MUST BE AWAITED
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
})();