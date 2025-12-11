import React from 'react';

interface EmptyRecordStateProps {
  message: string;
  actionText: string;
}

export const EmptyRecordState: React.FC<EmptyRecordStateProps> = ({
  message,
  actionText
}) => {
  return (
    <div className="flex flex-col items-center justify-center px-8 py-32">
      <p className="text-[15px] text-[#8B8B8B] text-center leading-relaxed">
        {message.split('\n').map((line, index) => (
          <React.Fragment key={index}>
            {line}
            {index < message.split('\n').length - 1 && <br />}
          </React.Fragment>
        ))}
      </p>
    </div>
  );
};
