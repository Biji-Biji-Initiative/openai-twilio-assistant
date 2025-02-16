import React from "react";

interface ConfigurationPreviewProps {
  instructions: string;
  voice: string;
}

const ConfigurationPreview: React.FC<ConfigurationPreviewProps> = ({
  instructions,
  voice,
}) => {
  return (
    <div className="mt-4 p-4 border rounded bg-gray-100">
      <h2 className="text-lg font-bold mb-2">Configuration Preview</h2>

      {/* Show the chosen voice clearly */}
      <p className="text-sm mb-2">
        <strong>Voice:</strong> {voice}
      </p>

      {/* Show the instructions clearly */}
      <p className="text-sm mb-2">
        <strong>Instructions:</strong> {instructions}
      </p>

      {/* Show JSON for developer reference */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 mb-1">Developer Preview:</p>
        <pre className="text-xs text-gray-800 overflow-auto">
          {JSON.stringify({ instructions, voice }, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default ConfigurationPreview; 