import ClassLogForm from '../components/ClassLogForm';

const SubmitClassLog = () => {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Submit Class Log</h1>
        <p className="text-gray-500">Record a class you have taken</p>
      </div>

      <div className="card">
        <ClassLogForm />
      </div>
    </div>
  );
};

export default SubmitClassLog;
