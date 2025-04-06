const UploadProgress = ({ progress }) => {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50">
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-80">
          <h3 className="text-lg font-semibold mb-4 text-center">Uploading Video</h3>
  
          <div className="w-full bg-gray-700 rounded-full h-4 mb-4">
            <div
              className="bg-blue-600 h-4 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
  
          <div className="text-center text-sm text-gray-300">{progress}% complete</div>
        </div>
      </div>
    )
  }
  
  export default UploadProgress