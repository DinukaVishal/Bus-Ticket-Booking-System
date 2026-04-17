import { cn } from '@/lib/utils';
import { SeatStatus, BusType, BUS_TYPE_CONFIGS } from '@/types/booking';
import { User, DoorOpen, Wind, Snowflake, Armchair } from 'lucide-react';

interface SeatLayoutProps {
  bookedSeats: number[];
  selectedSeats: number[];
  onSeatSelect: (seatNumber: number) => void;
  totalSeats?: number;
  busType?: BusType;
}

const SeatLayout = ({ 
  bookedSeats, 
  selectedSeats, 
  onSeatSelect, 
  totalSeats,
  busType = 'normal'
}: SeatLayoutProps) => {
  
  const config = BUS_TYPE_CONFIGS[busType] || BUS_TYPE_CONFIGS.normal;
  const mainSeats = totalSeats || config.defaultSeats;
  const jumpSeats = config.jumpSeats || 0;
  const effectiveTotalSeats = mainSeats + jumpSeats;

  // Check if all main seats are booked (needed for jump seat availability)
  const allMainSeatsBooked = Array.from({ length: mainSeats }, (_, i) => i + 1)
    .every(seat => bookedSeats.includes(seat) || selectedSeats.includes(seat));

  const isJumpSeat = (seatNumber: number): boolean => {
    return jumpSeats > 0 && seatNumber > mainSeats && seatNumber <= effectiveTotalSeats;
  };

  const getSeatStatus = (seatNumber: number): SeatStatus => {
    if (bookedSeats.includes(seatNumber)) return 'booked';
    if (selectedSeats.includes(seatNumber)) return 'selected';
    return 'available';
  };

  const handleSeatClick = (seatNumber: number) => {
    if (bookedSeats.includes(seatNumber)) return;
    if (isJumpSeat(seatNumber) && !allMainSeatsBooked) return;
    onSeatSelect(seatNumber);
  };

  const renderSeat = (seatNumber: number, isWindow: boolean = false, isJump: boolean = false, size: 'normal' | 'small' = 'normal') => {
    const status = getSeatStatus(seatNumber);
    const jumpSeatLocked = isJump && !allMainSeatsBooked;
    
    return (
      <button
        key={seatNumber}
        onClick={() => handleSeatClick(seatNumber)}
        disabled={status === 'booked' || jumpSeatLocked}
        className={cn(
          'seat relative group flex items-center justify-center transition-all shadow-sm rounded-lg',
          size === 'small' ? 'w-9 h-9' : 'w-10 h-10',
          status === 'available' && !jumpSeatLocked && 'seat-available hover:-translate-y-0.5',
          status === 'booked' && 'seat-booked cursor-not-allowed opacity-70',
          status === 'selected' && 'seat-selected shadow-md scale-105 ring-2 ring-primary',
          isWindow && status === 'available' && !isJump && 'ring-2 ring-sky-400/60',
          isJump && !jumpSeatLocked && status === 'available' && 'ring-2 ring-amber-400/60 bg-amber-50',
          isJump && jumpSeatLocked && 'bg-zinc-100 cursor-not-allowed opacity-50 border-dashed'
        )}
        aria-label={`${isJump ? 'Jump ' : ''}Seat ${seatNumber}${jumpSeatLocked ? ' (locked)' : ''}`}
        title={jumpSeatLocked ? 'Available when all main seats are booked' : undefined}
      >
        <span className={cn(
          "font-bold group-hover:text-foreground",
          size === 'small' ? "text-[10px]" : "text-xs",
          jumpSeatLocked ? "text-zinc-400" : "text-foreground/80"
        )}>
          {isJump ? `J${seatNumber}` : seatNumber}
        </span>
        {isWindow && !isJump && (
          <Wind className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 text-sky-500 bg-background rounded-full p-0.5 shadow-sm border border-sky-200" />
        )}
        {isJump && (
          <Armchair className={cn(
            "absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-background rounded-full p-0.5 shadow-sm border",
            jumpSeatLocked ? "text-zinc-400 border-zinc-300" : "text-amber-500 border-amber-200"
          )} />
        )}
      </button>
    );
  };

  // Rosa/Coaster Layout - matches the reference image exactly
  // Seat 1 front left, seats 2-3 on right
  // Then rows: left seat, jump seat in aisle, 2 right seats
  // Back row: 5 seats (22-26)
  const renderRosaLayout = () => {
    const rows = [];
    
    // Row 1: Seat 1 on left, empty aisle space, seats 2-3 on right
    rows.push(
      <div key="row-1" className="flex justify-center items-center mb-3">
        <span className="w-5 text-[10px] text-muted-foreground text-right font-mono">1</span>
        <div className="flex items-center ml-2" style={{ width: '220px' }}>
          <div className="w-10">{renderSeat(1, true)}</div>
          <div className="w-10 mx-1" /> {/* Empty jump seat space */}
          <div className="w-3" /> {/* Aisle */}
          <div className="flex gap-1.5">
            {renderSeat(2, false)}
            {renderSeat(3, true)}
          </div>
        </div>
        <span className="w-5 text-[10px] text-muted-foreground text-left font-mono ml-2">1</span>
      </div>
    );

    // Regular rows with jump seats (rows 2-7)
    const regularRowSeats = [
      { left: 4, jump: 27, right: [5, 6] },
      { left: 7, jump: 28, right: [8, 9] },
      { left: 10, jump: 29, right: [11, 12] },
      { left: 13, jump: 30, right: [14, 15] },
      { left: 16, jump: 31, right: [17, 18] },
      { left: 19, jump: 32, right: [20, 21] },
    ];

    regularRowSeats.forEach((row, index) => {
      rows.push(
        <div key={`row-${index + 2}`} className="flex justify-center items-center mb-3">
          <span className="w-5 text-[10px] text-muted-foreground text-right font-mono">{index + 2}</span>
          <div className="flex items-center ml-2" style={{ width: '220px' }}>
            <div className="w-10">{renderSeat(row.left, true)}</div>
            <div className="w-10 mx-1 flex justify-center">{renderSeat(row.jump, false, true)}</div>
            <div className="w-3" /> {/* Aisle */}
            <div className="flex gap-1.5">
              {renderSeat(row.right[0], false)}
              {renderSeat(row.right[1], true)}
            </div>
          </div>
          <span className="w-5 text-[10px] text-muted-foreground text-left font-mono ml-2">{index + 2}</span>
        </div>
      );
    });

    // Back row: seats 22-26
    rows.push(
      <div key="back-row" className="flex justify-center items-center mt-2 mb-3">
        <span className="w-5 text-[10px] text-muted-foreground text-right font-mono">8</span>
        <div className="flex gap-1.5 justify-center ml-2" style={{ width: '220px' }}>
          {renderSeat(22, true, false, 'small')}
          {renderSeat(23, false, false, 'small')}
          {renderSeat(24, false, false, 'small')}
          {renderSeat(25, false, false, 'small')}
          {renderSeat(26, true, false, 'small')}
        </div>
        <span className="w-5 text-[10px] text-muted-foreground text-left font-mono ml-2">8</span>
      </div>
    );

    return rows;
  };

  // Luxury A/C Layout - 2+2 layout, 45 seats, 5-seat back row
  const renderLuxuryACLayout = () => {
    const rows = [];
    let currentSeat = 1;
    const regularRows = 10; // 40 seats in regular rows, 5 in back

    for (let rowIndex = 0; rowIndex < regularRows; rowIndex++) {
      const leftSeats = [];
      const rightSeats = [];
      
      // Left side (2 seats)
      for (let i = 0; i < 2 && currentSeat <= 40; i++) {
        const isWindow = i === 0;
        leftSeats.push(renderSeat(currentSeat, isWindow));
        currentSeat++;
      }
      
      // Right side (2 seats)
      for (let i = 0; i < 2 && currentSeat <= 40; i++) {
        const isWindow = i === 1;
        rightSeats.push(renderSeat(currentSeat, isWindow));
        currentSeat++;
      }

      rows.push(
        <div key={rowIndex} className="flex justify-center items-center gap-3 mb-3">
          <span className="w-4 text-[10px] text-muted-foreground text-right font-mono">{rowIndex + 1}</span>
          <div className="flex gap-2 w-[5.5rem] justify-end">{leftSeats}</div>
          <div className="w-10" />
          <div className="flex gap-2 w-[5.5rem]">{rightSeats}</div>
          <span className="w-4 text-[10px] text-muted-foreground text-left font-mono">{rowIndex + 1}</span>
        </div>
      );
    }

    // Back row (5 seats: 41-45)
    rows.push(
      <div key="back-row" className="flex justify-center items-center gap-1 mb-3 mt-2">
        <span className="w-4 text-[10px] text-muted-foreground text-right font-mono">11</span>
        <div className="flex gap-1 justify-center">
          {renderSeat(41, true, false, 'small')}
          {renderSeat(42, false, false, 'small')}
          {renderSeat(43, false, false, 'small')}
          {renderSeat(44, false, false, 'small')}
          {renderSeat(45, true, false, 'small')}
        </div>
        <span className="w-4 text-[10px] text-muted-foreground text-left font-mono">11</span>
      </div>
    );

    return rows;
  };

  // Normal/Leyland Layout - 2+3 layout, 54 seats, exit door row 10, 6-seat back row
  const renderNormalLayout = () => {
    const rows = [];
    let currentSeat = 1;
    const exitRowIndex = 9; // Row 10 (0-indexed: 9) has exit door

    // Regular rows (rows 1-9, then row 10 with exit, then row 11 is back)
    for (let rowIndex = 0; rowIndex < 10; rowIndex++) {
      if (rowIndex === exitRowIndex) {
        // Exit row: only 3 seats on right side
        const rightSeats = [];
        for (let i = 0; i < 3 && currentSeat <= 48; i++) {
          const isWindow = i === 2;
          rightSeats.push(renderSeat(currentSeat, isWindow));
          currentSeat++;
        }

        rows.push(
          <div key={rowIndex} className="flex justify-center items-center gap-3 mb-3">
            <span className="w-4 text-[10px] text-muted-foreground text-right font-mono">{rowIndex + 1}</span>
            <div className="w-[5.5rem] h-10 rounded-lg bg-emerald-50/80 border border-dashed border-emerald-300 flex items-center justify-center">
              <div className="flex flex-col items-center opacity-80">
                <DoorOpen className="w-4 h-4 text-emerald-600 mb-0.5" />
                <span className="text-[8px] font-bold text-emerald-700 leading-none uppercase">EXIT</span>
              </div>
            </div>
            <div className="w-8" />
            <div className="flex gap-2 w-[8.5rem]">{rightSeats}</div>
            <span className="w-4 text-[10px] text-muted-foreground text-left font-mono">{rowIndex + 1}</span>
          </div>
        );
      } else {
        const leftSeats = [];
        const rightSeats = [];
        
        // Left side (2 seats)
        for (let i = 0; i < 2 && currentSeat <= 48; i++) {
          const isWindow = i === 0;
          leftSeats.push(renderSeat(currentSeat, isWindow));
          currentSeat++;
        }
        
        // Right side (3 seats)
        for (let i = 0; i < 3 && currentSeat <= 48; i++) {
          const isWindow = i === 2;
          rightSeats.push(renderSeat(currentSeat, isWindow));
          currentSeat++;
        }

        rows.push(
          <div key={rowIndex} className="flex justify-center items-center gap-3 mb-3">
            <span className="w-4 text-[10px] text-muted-foreground text-right font-mono">{rowIndex + 1}</span>
            <div className="flex gap-2 w-[5.5rem] justify-end">{leftSeats}</div>
            <div className="w-8" />
            <div className="flex gap-2 w-[8.5rem]">{rightSeats}</div>
            <span className="w-4 text-[10px] text-muted-foreground text-left font-mono">{rowIndex + 1}</span>
          </div>
        );
      }
    }

    // Back row (6 seats: 49-54)
    rows.push(
      <div key="back-row" className="flex justify-center items-center gap-1 mb-3 mt-2">
        <span className="w-4 text-[10px] text-muted-foreground text-right font-mono">11</span>
        <div className="flex gap-1 justify-center">
          {renderSeat(49, true, false, 'small')}
          {renderSeat(50, false, false, 'small')}
          {renderSeat(51, false, false, 'small')}
          {renderSeat(52, false, false, 'small')}
          {renderSeat(53, false, false, 'small')}
          {renderSeat(54, true, false, 'small')}
        </div>
        <span className="w-4 text-[10px] text-muted-foreground text-left font-mono">11</span>
      </div>
    );

    return rows;
  };

  // Super Long Layout - similar to Luxury AC but with 54 seats
  const renderSuperLongLayout = () => {
    const rows = [];
    let currentSeat = 1;
    const regularRows = 12; // 48 seats in regular rows, 6 in back

    for (let rowIndex = 0; rowIndex < regularRows; rowIndex++) {
      const leftSeats = [];
      const rightSeats = [];
      
      // Left side (2 seats)
      for (let i = 0; i < 2 && currentSeat <= 48; i++) {
        const isWindow = i === 0;
        leftSeats.push(renderSeat(currentSeat, isWindow));
        currentSeat++;
      }
      
      // Right side (2 seats)
      for (let i = 0; i < 2 && currentSeat <= 48; i++) {
        const isWindow = i === 1;
        rightSeats.push(renderSeat(currentSeat, isWindow));
        currentSeat++;
      }

      rows.push(
        <div key={rowIndex} className="flex justify-center items-center gap-3 mb-3">
          <span className="w-4 text-[10px] text-muted-foreground text-right font-mono">{rowIndex + 1}</span>
          <div className="flex gap-2 w-[5.5rem] justify-end">{leftSeats}</div>
          <div className="w-10" />
          <div className="flex gap-2 w-[5.5rem]">{rightSeats}</div>
          <span className="w-4 text-[10px] text-muted-foreground text-left font-mono">{rowIndex + 1}</span>
        </div>
      );
    }

    // Back row (6 seats: 49-54)
    rows.push(
      <div key="back-row" className="flex justify-center items-center gap-1 mb-3 mt-2">
        <span className="w-4 text-[10px] text-muted-foreground text-right font-mono">13</span>
        <div className="flex gap-1 justify-center">
          {renderSeat(49, true, false, 'small')}
          {renderSeat(50, false, false, 'small')}
          {renderSeat(51, false, false, 'small')}
          {renderSeat(52, false, false, 'small')}
          {renderSeat(53, false, false, 'small')}
          {renderSeat(54, true, false, 'small')}
        </div>
        <span className="w-4 text-[10px] text-muted-foreground text-left font-mono">13</span>
      </div>
    );

    return rows;
  };

  const renderLayout = () => {
    switch (busType) {
      case 'rosa':
        return renderRosaLayout();
      case 'luxury_ac':
        return renderLuxuryACLayout();
      case 'super_long':
        return renderSuperLongLayout();
      case 'normal':
      default:
        return renderNormalLayout();
    }
  };

  const getBusTypeBadgeStyle = () => {
    switch (busType) {
      case 'rosa':
        return "bg-purple-50 text-purple-600 border-purple-100";
      case 'luxury_ac':
        return "bg-sky-50 text-sky-600 border-sky-100";
      case 'super_long':
        return "bg-indigo-50 text-indigo-600 border-indigo-100";
      default:
        return "bg-orange-50 text-orange-600 border-orange-100";
    }
  };

  return (
    <div className="bg-card rounded-xl p-6 shadow-sm border w-full max-w-md mx-auto">
      {/* Header Info */}
      <div className="flex flex-col items-center gap-2 mb-6">
        <div className={cn(
          "flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm border",
          getBusTypeBadgeStyle()
        )}>
          {config.isAC ? (
            <Snowflake className="w-3.5 h-3.5" />
          ) : (
            <Wind className="w-3.5 h-3.5" />
          )}
          {config.name}
        </div>
        <span className="text-xs text-muted-foreground">
          {config.sinhalaName} • {effectiveTotalSeats} ආසන
        </span>
      </div>

      {/* Bus Body */}
      <div className="relative bg-zinc-50/50 dark:bg-zinc-900/50 rounded-[2.5rem] p-5 border-[3px] border-zinc-200 dark:border-zinc-800">
        
        {/* Front Section */}
        <div className="flex justify-between items-end mb-8 px-2 border-b-2 border-dashed border-zinc-200 pb-4">
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-10 rounded border-2 border-dashed border-rose-300 flex items-center justify-center bg-rose-50/50">
               <DoorOpen className="w-4 h-4 text-rose-400" />
            </div>
            <span className="text-[9px] font-bold text-rose-400">DOOR</span>
          </div>

          <span className="bg-zinc-100 text-zinc-500 px-4 py-1 rounded-full text-[10px] font-extrabold tracking-widest border border-zinc-200">
             FRONT
          </span>

          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-10 rounded border-2 border-zinc-400 flex items-center justify-center bg-zinc-800">
               <User className="w-4 h-4 text-white" />
            </div>
            <span className="text-[9px] font-bold text-zinc-400">DRVR</span>
          </div>
        </div>

        {/* SEATS RENDER */}
        <div className="flex flex-col items-center">
          {renderLayout()}
        </div>

        {/* Rear Section */}
        <div className="mt-8 text-center border-t-2 border-dashed border-zinc-200 pt-3">
          <span className="text-[9px] font-bold text-zinc-300 tracking-[0.3em]">REAR</span>
        </div>
      </div>

      {/* Footer Legend */}
      <div className="grid grid-cols-2 gap-y-3 gap-x-4 mt-6 pt-5 border-t border-zinc-100 px-2">
        <div className="flex items-center gap-2.5">
          <div className="w-4 h-4 rounded bg-seat-available border border-zinc-200 shadow-sm" />
          <span className="text-xs text-zinc-600 font-medium">Available</span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-4 h-4 rounded bg-seat-booked opacity-60" />
          <span className="text-xs text-zinc-600 font-medium">Booked</span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-4 h-4 rounded bg-seat-selected shadow-sm" />
          <span className="text-xs text-zinc-600 font-medium">Your Seat</span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-4 h-4 rounded bg-white ring-2 ring-sky-400/60 shadow-sm flex items-center justify-center">
             <Wind className="w-2.5 h-2.5 text-sky-500" />
          </div>
          <span className="text-xs text-zinc-600 font-medium">Window</span>
        </div>
        {jumpSeats > 0 && (
          <div className="flex items-center gap-2.5 col-span-2">
            <div className="w-4 h-4 rounded bg-amber-50 ring-2 ring-amber-400/60 shadow-sm flex items-center justify-center">
               <Armchair className="w-2.5 h-2.5 text-amber-500" />
            </div>
            <span className="text-xs text-zinc-600 font-medium">Jump Seat (available when full)</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SeatLayout;
