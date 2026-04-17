import emailjs from '@emailjs/browser';

// ඔයා එවපු ID ටික මෙතනට දැම්මා
const SERVICE_ID = 'service_ykszbo5';
const TEMPLATE_ID = 'template_sv8cszt';
const PUBLIC_KEY = '-ug6GxoH7K-TEVr1R';

interface EmailData {
  to_name: string;
  to_email: string;
  booking_id: string;
  route_name: string;
  date: string;
  seats: string;
  total_price: string;
}

export const sendBookingEmail = async (data: EmailData) => {
  try {
    const response = await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        to_name: data.to_name,
        // Template එකේ තියෙන නම් වලට ගැලපෙන්න ඕන
        to_email: data.to_email,
        route_name: data.route_name,
        date: data.date,
        seats: data.seats,
        booking_id: data.booking_id,
        total_price: data.total_price,
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