import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { Booking, Route } from '@/types/booking';

// ─── Type Extensions ─────────────────────────────────────────────────────────
interface RouteStop {
  name: string;
  time: string;
}

interface ExtendedRoute extends Route {
  arrivalTime?: string;
  boardingPoint?: string;
  via?: RouteStop[];
  stops?: string[] | any[];
  duration?: string;
  driverPhone?: string;     
  conductorPhone?: string;  
  busType?: string;         
  totalSeats?: number | string; 
}

interface TicketData {
  booking: Booking;
  route: ExtendedRoute;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function labelValue(
  doc: jsPDF, label: string, value: string, x: number, y: number,
  subValue: string = '', labelColor = [100, 100, 100] as const, valueColor = [0, 0, 0] as const
) {
  doc.setFontSize(7.5); 
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...labelColor);
  doc.text(label.toUpperCase(), x, y);
  
  doc.setFontSize(9.5); 
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...valueColor);
  doc.text(value, x, y + 4.5);

  if (subValue) {
    doc.setFontSize(7.5); 
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...labelColor);
    doc.text(subValue, x, y + 8.5);
  }
}

function drawBusIcon(doc: jsPDF, type: string, cx: number, cy: number) {
  const t = type.toLowerCase();
  
  if (t.includes('rosa') || t.includes('coaster')) {
    doc.setDrawColor(168, 85, 247); 
    doc.setLineWidth(0.4);
    for(let i=0; i<4; i++) {
      const angle = (i * Math.PI) / 4;
      const dx = Math.cos(angle) * 2;
      const dy = Math.sin(angle) * 2;
      doc.line(cx - dx, cy - dy, cx + dx, cy + dy);
    }
  } else if (t.includes('luxury') || t.includes('a/c')) {
    doc.setDrawColor(56, 189, 248); 
    doc.setLineWidth(0.4);
    for(let i=0; i<3; i++) {
      const angle = (i * Math.PI) / 3;
      const dx = Math.cos(angle) * 2;
      const dy = Math.sin(angle) * 2;
      doc.line(cx - dx, cy - dy, cx + dx, cy + dy);
    }
  } else if (t.includes('normal')) {
    doc.setDrawColor(249, 115, 22); 
    doc.setLineWidth(0.4);
    doc.line(cx - 2, cy - 1.5, cx + 1, cy - 1.5);
    doc.line(cx - 1, cy,       cx + 2, cy);
    doc.line(cx - 2, cy + 1.5, cx + 0.5, cy + 1.5);
  } else {
    doc.setDrawColor(99, 102, 241); 
    doc.setFillColor(99, 102, 241);
    doc.setLineWidth(0.3);
    doc.roundedRect(cx - 2, cy - 2, 4, 3, 0.5, 0.5, 'S');
    doc.rect(cx - 1.5, cy - 1.5, 1.2, 1, 'S'); 
    doc.rect(cx + 0.3, cy - 1.5, 1.2, 1, 'S'); 
    doc.circle(cx - 1, cy + 1.5, 0.6, 'F');    
    doc.circle(cx + 1, cy + 1.5, 0.6, 'F');    
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export const generateTicketPDF = async (tickets: TicketData[]): Promise<void> => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const PW = doc.internal.pageSize.getWidth();
  const M = 15; 
  const TW = PW - (M * 2); 

  // Colors
  const NAVY = [26, 43, 105] as const;
  const LIGHT_BLUE_PILL = [65, 105, 225] as const;
  const GREEN = [20, 180, 100] as const;
  const RED = [220, 50, 50] as const;
  const DOT_BLUE = [65, 105, 225] as const;
  const BG_LIGHT_BLUE = [238, 242, 255] as const;
  const YELLOW_STRIP = [255, 240, 180] as const;
  const ORANGE_STRIP = [240, 150, 0] as const;
  const TEXT_MUTED = [100, 100, 100] as const;

  const { booking: fb, route } = tickets[0];
  const seatNumbers = tickets.map(t => t.booking.seatNumber).sort((a, b) => a - b);
  const totalPrice = route.price * tickets.length;
  const bookingIds = tickets.map(t => t.booking.id);
  
  const baseId = fb.id.toString().toUpperCase();
  const ticketRef = baseId.startsWith('BK') ? baseId.substring(0,8) : `BK${baseId.substring(0,6)}`;

  let rawStops: RouteStop[] = [];
  
  if (route.via && route.via.length > 0) {
    rawStops = route.via;
  } else if (route.stops && Array.isArray(route.stops) && route.stops.length > 0) {
    rawStops = route.stops.map(s => ({
      name: typeof s === 'string' ? s : (s.name || ''),
      time: typeof s === 'string' ? '' : (s.time || '')
    }));
  } else {
    if (route.from?.toLowerCase() === 'kandy' && route.to?.toLowerCase() === 'colombo') {
      rawStops = [
        { name: 'Peradeniya', time: '' },
        { name: 'Kadugannawa', time: '' },
        { name: 'Kegalle', time: '' },
        { name: 'Nittambuwa', time: '' },
        { name: 'Kadawatha', time: '' }
      ];
    }
  }

  const allStops = [
    { name: route.from, time: route.departureTime, type: 'origin' },
    ...rawStops.map(s => ({ ...s, type: 'via' })),
    { name: route.to, time: route.arrivalTime ?? '11:00 AM', type: 'destination' },
  ];

  const boardingPoint = route.boardingPoint ?? 'Kandy Central Bus Stand, Bay 14';
  const arrivalTime = route.arrivalTime ?? '11:00 AM';
  const duration = route.duration ?? '8h 30m';

  let yPos = M;

  // ── HEADER ────────────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(M, yPos, TW, 22, 'F'); 

  // ==========================================
  // අලුත් QuickBus Logo එක ඇඳීම
  // ==========================================
  const logoX = M + 7;
  const logoY = yPos + 6;
  
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.8);
  
  // බස් එකේ Outline එක
  doc.line(logoX + 2, logoY, logoX + 13, logoY); // Top roof
  doc.line(logoX, logoY + 2, logoX, logoY + 7); // Left back
  doc.line(logoX, logoY + 2, logoX + 2, logoY); // Top-left corner
  doc.line(logoX, logoY + 7, logoX + 2, logoY + 9); // Bottom-left corner
  doc.line(logoX + 2, logoY + 9, logoX + 14, logoY + 9); // Bottom body
  doc.line(logoX + 13, logoY, logoX + 16, logoY + 5); // Slanted windshield
  doc.line(logoX + 16, logoY + 5, logoX + 16, logoY + 7); // Front grill
  doc.line(logoX + 16, logoY + 7, logoX + 14, logoY + 9); // Bottom-right corner
  
  // රෝද (Wheels)
  doc.setFillColor(...NAVY);
  doc.circle(logoX + 4, logoY + 9, 1.8, 'FD');
  doc.circle(logoX + 12, logoY + 9, 1.8, 'FD');
  doc.setFillColor(255, 255, 255);
  doc.circle(logoX + 4, logoY + 9, 0.7, 'F');
  doc.circle(logoX + 12, logoY + 9, 0.7, 'F');

  // ජනෙල් (Windows)
  doc.setLineWidth(0.6);
  doc.rect(logoX + 1.5, logoY + 1.5, 3, 3.5, 'S'); // Window 1
  doc.rect(logoX + 5.5, logoY + 1.5, 3, 3.5, 'S'); // Window 2
  // Slanted Window 3
  doc.line(logoX + 9.5, logoY + 1.5, logoX + 12, logoY + 1.5);
  doc.line(logoX + 12, logoY + 1.5, logoX + 13.5, logoY + 4.5);
  doc.line(logoX + 13.5, logoY + 4.5, logoX + 9.5, logoY + 4.5);
  doc.line(logoX + 9.5, logoY + 4.5, logoX + 9.5, logoY + 1.5);

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('QuickBus', M + 28, yPos + 10);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 200, 255);
  doc.text('Smart Bus Ticketing', M + 28, yPos + 14);

  // Ticket No Pill
  doc.setFillColor(...LIGHT_BLUE_PILL);
  doc.roundedRect(M + TW - 40, yPos + 5, 32, 11, 5.5, 5.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6.5);
  doc.text('TICKET NO.', M + TW - 24, yPos + 9.5, { align: 'center' });
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(ticketRef, M + TW - 24, yPos + 13.5, { align: 'center' });

  yPos += 45;

  // ── ROUTE HERO ────────────────────────────────────────────────────────────
  const CX = PW / 2;
  const fromX = M + 25;
  const toX = M + TW - 25;

  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(fromX + 15, yPos, toX - 15, yPos);
  doc.setLineDashPattern([], 0);

  doc.setFillColor(...NAVY);
  doc.roundedRect(CX - 12, yPos - 3, 24, 6, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.text('EXPRESS', CX, yPos + 1, { align: 'center' });

  doc.setFillColor(...GREEN);
  doc.circle(fromX, yPos, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text('A', fromX, yPos + 1.5, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11); 
  doc.text(route.from.toUpperCase(), fromX, yPos + 11, { align: 'center' });
  doc.setTextColor(...TEXT_MUTED);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(route.departureTime, fromX, yPos + 15, { align: 'center' });

  doc.setFillColor(...RED);
  doc.circle(toX, yPos, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('B', toX, yPos + 1.5, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.text(route.to.toUpperCase(), toX, yPos + 11, { align: 'center' });
  doc.setTextColor(...TEXT_MUTED);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(arrivalTime, toX, yPos + 15, { align: 'center' });

  yPos += 28;

  // ── ROUTE MAP TIMELINE ────────────────────────────────────────────────────
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('ROUTE MAP', M, yPos);

  yPos += 12;
  const mapLeft = M + 8;
  const mapRight = M + TW - 8;
  const mapWidth = mapRight - mapLeft;
  const segW = mapWidth / (allStops.length - 1 || 1); 

  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(1);
  doc.line(mapLeft, yPos, mapRight, yPos);

  const nameFontSize = allStops.length > 5 ? 6 : 7.5;

  allStops.forEach((stop, i) => {
    const sx = mapLeft + i * segW;
    const isOrigin = stop.type === 'origin';
    const isDest = stop.type === 'destination';
    const strokeColor = isOrigin ? GREEN : isDest ? RED : DOT_BLUE;
    
    doc.setDrawColor(...strokeColor);
    doc.setFillColor(255, 255, 255);
    doc.circle(sx, yPos, 3, 'FD'); 
    doc.setFillColor(...strokeColor);
    doc.circle(sx, yPos, 1.2, 'F');

    doc.setFontSize(nameFontSize);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', isOrigin || isDest ? 'bold' : 'normal');
    doc.text(stop.name, sx, yPos + 5, { align: 'center' });

    if (stop.time) {
      doc.setFontSize(6.5);
      doc.setTextColor(...TEXT_MUTED);
      doc.setFont('helvetica', 'normal');
      const formattedTime = stop.time.replace(' AM', '').replace(' PM', ''); 
      doc.text(formattedTime, sx, yPos + 8.5, { align: 'center' });
    }
  });

  yPos += 16; 
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`Total duration: ${duration}    |    Stops: ${rawStops.length} intermediate`, M, yPos);

  yPos += 18; 

  // ── GRID DETAILS ──────────────────────────────────────────────────────────
  const colW = TW / 4;
  labelValue(doc, 'DATE', fb.date || 'N/A', M, yPos);
  labelValue(doc, 'DEP.', route.departureTime, M + colW, yPos);
  labelValue(doc, 'ARR.', arrivalTime, M + colW * 2, yPos);
  labelValue(doc, 'PASSENGER', fb.passengerName || 'Guest', M + colW * 3, yPos);

  yPos += 14;

  // ── BOARDING POINT ────────────────────────────────────────────────────────
  doc.setFillColor(...BG_LIGHT_BLUE);
  doc.roundedRect(M, yPos, TW, 16, 2, 2, 'F');
  
  doc.setFillColor(...LIGHT_BLUE_PILL);
  doc.roundedRect(M + 4, yPos + 3, 10, 10, 2, 2, 'F');
  
  // ==========================================
  // අලුත් Map Location Pin එක
  // ==========================================
  doc.setFillColor(255, 255, 255);
  doc.circle(M + 9, yPos + 6.5, 2, 'F'); // Pin head
  doc.triangle(M + 7.4, yPos + 7.2, M + 10.6, yPos + 7.2, M + 9, yPos + 10.8, 'F'); // Pin point
  doc.setFillColor(...LIGHT_BLUE_PILL);
  doc.circle(M + 9, yPos + 6.2, 0.8, 'F'); // Pin hole

  doc.setFontSize(7);
  doc.setTextColor(...LIGHT_BLUE_PILL);
  doc.setFont('helvetica', 'bold');
  doc.text('BOARDING POINT', M + 18, yPos + 7.5);
  doc.setFontSize(9.5);
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.text(boardingPoint, M + 18, yPos + 12);

  yPos += 24;

  // ── VEHICLE DETAILS ───────────────────────────────────────────────────────
  doc.setFontSize(7.5); 
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_MUTED);
  doc.text('BUS NO. & TYPE', M, yPos);
  
  doc.setFontSize(9.5); 
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(route.busNumber || 'N/A', M, yPos + 4.5);

  const bType = route.busType || 'Super Long';
  const bSeats = route.totalSeats ? `${route.totalSeats} seats` : '54 seats';

  drawBusIcon(doc, bType, M + 2, yPos + 7.5);

  doc.setFontSize(7.5); 
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TEXT_MUTED);
  doc.text(`${bType} • ${bSeats}`, M + 5.5, yPos + 8.5);

  labelValue(doc, 'DRIVER', route.driverName || 'N/A', M + colW * 1.5, yPos, route.driverPhone || '');
  labelValue(doc, 'CONDUCTOR', route.conductorName || 'N/A', M + colW * 3, yPos, route.conductorPhone || '');

  yPos += 20; 

  // ── SEATS & FARE ──────────────────────────────────────────────────────────
  const boxW = (TW - 4) / 2;
  
  doc.setFillColor(...GREEN);
  doc.roundedRect(M, yPos, boxW, 22, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('SEAT(S)', M + 5, yPos + 7);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(seatNumbers.map(s => `#${s}`).join('  '), M + 5, yPos + 16);

  doc.setFillColor(...NAVY);
  doc.roundedRect(M + boxW + 4, yPos, boxW, 22, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('TOTAL FARE', M + boxW + 9, yPos + 7);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`LKR ${totalPrice.toLocaleString()}`, M + boxW + 9, yPos + 16);

  yPos += 30;

  // ── QR & FOOTER INFO ──────────────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.roundedRect(M, yPos, 32, 36, 2, 2, 'F'); 

  try {
    const qrData = JSON.stringify({ id: bookingIds.join(','), seats: seatNumbers.join(','), date: fb.date });
    const qrImage = await QRCode.toDataURL(qrData, { 
      margin: 1, 
      width: 150, 
      color: { dark: '#ffffff', light: '#1a2b69' } 
    });
    doc.addImage(qrImage, 'PNG', M + 2, yPos + 2, 28, 28);
  } catch {}
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Scan to verify', M + 16, yPos + 33, { align: 'center' });

  const rx = M + 42;
  let ry = yPos + 4;
  labelValue(doc, 'BOOKING REF', ticketRef, rx, ry);
  ry += 11;
  labelValue(doc, 'ROUTE', `${route.from.toUpperCase()} - ${route.to.toUpperCase()}`, rx, ry);
  ry += 11;
  labelValue(doc, 'DEP.', route.departureTime, rx, ry);
  labelValue(doc, 'ARR.', arrivalTime, rx + 25, ry);

  yPos += 42; 

  // ── COLORED STRIPS AT BOTTOM ──────────────────────────────────────────────
  doc.setFillColor(...YELLOW_STRIP);
  doc.rect(M, yPos, TW, 10, 'F');
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Cancellation policy: Free cancel >24 hrs before departure. 50% fee within 24 hrs.', M + 4, yPos + 6.5);
  
  yPos += 10;

  doc.setFillColor(...ORANGE_STRIP);
  doc.rect(M, yPos, TW, 9, 'F');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(7.5);
  doc.text('Arrive 15 min early   •   Show ticket to conductor   •   No refund on no-show', M + 4, yPos + 6);

  yPos += 9;

  doc.setFillColor(...NAVY);
  doc.rect(M, yPos, TW, 9, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.text('QuickBus • support@quickbus.lk • Hotline: 011-2345678', PW / 2, yPos + 6, { align: 'center' });

  doc.save(`Ticket_${fb.id}.pdf`);
};