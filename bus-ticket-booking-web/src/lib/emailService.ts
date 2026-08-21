import emailjs from '@emailjs/browser';

// EmailJS credentials (ONLY these)
const SERVICE_ID = 'service_xwropsr';
const TEMPLATE_ID = 'template_zrjlh4n';
const PUBLIC_KEY = 'Ahm9lFuZR_Fkr485u';

export interface EmailData {
  to_name: string;
  to_email: string;
  ticket_id: string;
  seat_no: string;
  route: string;
  travel_date: string;
  payment_amount: string;
}

export const sendBookingEmail = async (data: EmailData) => {
  try {
    const response = await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        // Must match EmailJS template EXACT variable names
        to_name: data.to_name,
        to_email: data.to_email,
        ticket_id: data.ticket_id,
        seat_no: data.seat_no,
        route: data.route,
        travel_date: data.travel_date,
        payment_amount: data.payment_amount,
      },
      PUBLIC_KEY
    );

    console.log('EMAIL SUCCESS!', response.status, response.text);
    return true;
  } catch (err) {
    console.error('EMAIL FAILED...', err);
    return false;
  }
};

