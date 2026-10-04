export const BATCHES = ['September', 'December', 'March', 'July'];

export const orderedBatchKeys = (groups = {}) => {
  const keys = Object.keys(groups);
  const canonical = BATCHES.filter((batch) => keys.includes(batch));
  const historical = keys
    .filter((batch) => !BATCHES.includes(batch))
    .sort((a, b) => a.localeCompare(b));

  return [...canonical, ...historical];
};
