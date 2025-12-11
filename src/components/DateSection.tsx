import React, { useState } from 'react';

interface DateButtonProps {
  day: string;
  date: string;
  isSelected?: boolean;
  onClick: () => void;
}

const DateButton: React.FC<DateButtonProps> = ({ day, date, isSelected, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`flex min-h-[72px] flex-col items-center justify-center w-[52px] rounded-2xl ${
        isSelected
          ? 'bg-[rgba(60,60,60,1)] text-white'
          : 'bg-white border border-[rgba(0,0,0,0.05)] border-solid'
      }`}
    >
      <div className={`flex w-2.5 flex-col text-xs leading-none ${
        isSelected ? 'text-white' : 'text-[rgba(85,85,85,1)]'
      }`}>
        <div>{day}</div>
      </div>
      <div className={`flex w-[18px] flex-col items-stretch text-base justify-center mt-1 py-px ${
        isSelected ? 'text-white' : 'text-[rgba(51,51,51,1)]'
      }`}>
        <div className="z-10">{date}</div>
      </div>
    </button>
  );
};

export const DateSection: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(3); // Thursday (16th) is selected by default

  const dates = [
    { day: '월', date: '13' },
    { day: '화', date: '14' },
    { day: '수', date: '15' },
    { day: '목', date: '16' },
    { day: '금', date: '17' },
    { day: '토', date: '18' },
    { day: '일', date: '19' },
  ];

  return (
    <section className="bg-[rgba(249,248,246,1)] flex w-full flex-col px-5 py-[25px]">
      <div className="text-[rgba(90,90,90,1)] text-[13px] font-semibold">
        🌿 오늘
      </div>
      <div className="text-[rgba(46,46,46,1)] text-lg font-medium leading-loose mt-[7px]">
        2025년 10월 16일
      </div>
      <div className="bg-[rgba(0,0,0,0.05)] flex w-6 shrink-0 h-px mt-4 rounded-[16777200px]" />
      <div className="self-stretch flex min-h-20 gap-3 overflow-x-auto overflow-y-hidden font-normal whitespace-nowrap mt-6 pl-1 pb-2 scrollbar-hide">
        {dates.map((dateItem, index) => (
          <DateButton
            key={index}
            day={dateItem.day}
            date={dateItem.date}
            isSelected={selectedDate === index}
            onClick={() => setSelectedDate(index)}
          />
        ))}
      </div>
    </section>
  );
};
