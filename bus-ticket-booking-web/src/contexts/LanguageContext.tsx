import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type Locale = 'en' | 'si' | 'ta';

const AVAILABLE_LOCALES: Locale[] = ['en', 'si', 'ta'];

const TRANSLATIONS: Record<Locale, Record<string, string>> = {
  en: {
    'nav.bookTickets': 'Book Tickets',
    'nav.liveTrack': 'Live Track',
    'nav.myBookings': 'My Bookings',
    'nav.driver': 'Driver',
    'nav.admin': 'Admin',
    'nav.login': 'Login',
    'nav.profile': 'My Account Profile',
    'nav.signOut': 'Sign out',
    'hero.title': 'Book Your Bus Ticket',
    'hero.subtitle': 'Select your route, pick a date, and choose your preferred seats for a comfortable journey',
    'steps.route': 'Route',
    'steps.date': 'Date',
    'steps.seats': 'Seats',
    'steps.details': 'Details',
    'form.title': 'Passenger Details',
    'form.fullName': 'Full Name',
    'form.phoneNumber': 'Phone Number',
    'form.emailAddress': 'Email Address',
    'form.confirmBooking': 'Confirm Booking',
    'form.processing': 'Processing...',
    'form.route': 'Route',
    'form.date': 'Date',
    'form.departure': 'Departure',
    'form.seatNumbers': 'Seat Numbers',
    'form.numberOfSeats': 'Number of Seats',
    'form.pricePerSeat': 'Price per Seat',
    'form.totalPrice': 'Total Price',
    'form.seatHold': 'Your selected seats are held for',
    'loading.seats': 'Loading seats...',
    'button.back': 'Back',
    'button.continue': 'Continue',
    'form.holdExpired': 'Your seat hold has expired. Please reselect your seats.',
    'form.guestEmailNote': 'Please enter an email to receive your e-ticket confirmation.',
    'booking.confirmed': 'Booking Confirmed!',
    'booking.successOne': 'Your seat has been successfully reserved',
    'booking.successMany': 'Your seats have been successfully reserved',
    'booking.download': 'Download Ticket',
    'booking.bookAnother': 'Book Another Ticket',
    'booking.saveId': 'Please save your booking ID for future reference',
    'booking.emailSent': 'Confirmation email sent',
    'booking.emailFailed': 'Email notification failed, but your booking is confirmed.',
    'selectRouteFirst': 'Please select a route and date first',
    'submit.failed': 'Some seats were just booked by someone else. Please select different seats.',
    'hold.waiting': 'Reserving your selected seats...',
  },
  si: {
    'nav.bookTickets': 'ටිකට් වෙන් කරන්න',
    'nav.liveTrack': 'සජීවී පසුපස',
    'nav.myBookings': 'මගේ වෙන්කිරීම්',
    'nav.driver': 'රියදුරු',
    'nav.admin': 'පරිපාලක',
    'nav.login': 'ඇතුලු වන්න',
    'nav.profile': 'මගේ ගිණුම',
    'nav.signOut': 'ප්‍රතික්ෂේප කරන්න',
    'hero.title': 'ඔබේ බස් ටිකට් එක වෙන් කරන්න',
    'hero.subtitle': 'ඔබගේ මාර්ගය තෝරා, දිනය තෝරා, ප්‍රියතම මන්දි බස ඔබේ ගමන සඳහා තෝරන්න',
    'steps.route': 'මාර්ගය',
    'steps.date': 'දිනය',
    'steps.seats': 'සිටීන්',
    'steps.details': 'විස්තර',
    'form.title': 'ප්‍රවාහක විස්තර',
    'form.fullName': 'සම්පූර්ණ නම',
    'form.phoneNumber': 'දුරකථන අංකය',
    'form.emailAddress': 'ඊමේල් ලිපිනය',
    'form.confirmBooking': 'වෙන් කිරීම තහවුරු කරන්න',
    'form.processing': 'සකස් වෙමින්...',
    'form.route': 'මාර්ගය',
    'form.date': 'දිනය',
    'form.departure': 'පිටත් වීම',
    'form.seatNumbers': 'සිටී අංක',
    'form.numberOfSeats': 'සිටී ගණන',
    'form.pricePerSeat': 'සිටියකට ගාස්තු',
    'form.totalPrice': 'මුළු මුදල',
    'form.seatHold': 'ඔබ තෝරාගත් සිටීන් එකතු කර ඇත',
    'loading.seats': 'සිටී පූරණ වෙමින්... ',
    'button.back': 'ආපසු',
    'button.continue': 'ඉදිරියට',
    'form.holdExpired': 'ඔබගේ සිටීන් රඳවීම කල් ඉකුත්විය. කරුණාකර නැවත තෝරන්න.',
    'form.guestEmailNote': 'ඔබගේ ඉ-ටිකට් තහවුරු කිරීම සඳහා ඊමේල් එකක් ලබා දෙන්න.',
    'booking.confirmed': 'වෙන් කිරීම තහවුරු විය!',
    'booking.successOne': 'ඔබගේ සිටිය වෙන් කර ඇත',
    'booking.successMany': 'ඔබගේ සිටීන් වෙන් කර ඇත',
    'booking.download': 'ටිකට් ලබාගන්න',
    'booking.bookAnother': 'තව ටිකට් එකක් වෙන් කරන්න',
    'booking.saveId': 'ඉදිරියට සදහන් කිරීමට ඔබගේ වෙන් කිරීමේ හැඳුනුම් අංකය සුරකින්න',
    'booking.emailSent': 'තහවුරුකරණ ඊමේල් යවා ඇත',
    'booking.emailFailed': 'ඊමේල් දැනුම්දීම් අසාර්ථකයි, නමුත් ඔබගේ වෙන් කිරීම තහවුරු වී ඇත.',
    'selectRouteFirst': 'කරුණාකර පළමුව මාර්ගය සහ දිනය තෝරන්න',
    'submit.failed': 'සම්පූර්ණ කිරීමට පෙර සිටීන් කිසිවක් කල් අසු කර ඇත. කරුණාකර නැවත තෝරන්න.',
    'hold.waiting': 'ඔබගේ සිටීන් රඳවා ඇත...',
  },
  ta: {
    'nav.bookTickets': 'டிக்கெட் பதிவு',
    'nav.liveTrack': 'தானியங்கி கண்காணிப்பு',
    'nav.myBookings': 'எனது பதிவு',
    'nav.driver': 'இயக்குனர்',
    'nav.admin': 'நிர்வாகி',
    'nav.login': 'உள்நுழைய',
    'nav.profile': 'என் கணக்கு',
    'nav.signOut': 'வெளியேறு',
    'hero.title': 'உங்கள் பேருந்து டிக்கெட்டை முன்பதிவு செய்யவும்',
    'hero.subtitle': 'உங்கள் வழியை தேர்வு செய்து, தேதி மற்றும் பிடித்த இருக்கைகளை தேர்வு செய்து, பயணத்தை வசதியாக செய்யவும்',
    'steps.route': 'வழி',
    'steps.date': 'தேதி',
    'steps.seats': 'இருக்கைகள்',
    'steps.details': 'விவரங்கள்',
    'form.title': 'பயணிகள் தகவல்',
    'form.fullName': 'முழு பெயர்',
    'form.phoneNumber': 'தொலைபேசி எண்',
    'form.emailAddress': 'மின்னஞ்சல் முகவரி',
    'form.confirmBooking': 'முதியுங்கள்',
    'form.processing': 'செயல்படுத்துகிறது...',
    'form.route': 'வழி',
    'form.date': 'தேதி',
    'form.departure': 'புறப்படிப் பதிவு',
    'form.seatNumbers': 'இருக்கை எண்கள்',
    'form.numberOfSeats': 'இருக்கைகள் எண்ணிக்கை',
    'form.pricePerSeat': 'ஒரு இருக்கைக்கு விலை',
    'form.totalPrice': 'மொத்தத் தொகை',
    'form.seatHold': 'உங்கள் தேர்ந்தெடுத்த இருக்கைகள் பாதுகாக்கப்பட்டுள்ளன',
    'loading.seats': 'இருக்கைகள் ஏற்றப்படுகிறது...',
    'button.back': 'பின்செல்',
    'button.continue': 'தொடர்',
    'form.holdExpired': 'உங்கள் இருக்கை பிடிப்பு காலாவதியானது. மீண்டும் தேர்ந்தெடுக்கவும்.',
    'form.guestEmailNote': 'உங்கள் மின்னஞ்சல் மூலம் டிக்கெட் पुष்டிச்செய்யவும்.',
    'booking.confirmed': 'பதிவு உறுதியாகியது!',
    'booking.successOne': 'உங்கள் இருக்கை வெற்றிகரமாக முன்பதிவு செய்யப்பட்டது',
    'booking.successMany': 'உங்கள் இடம் வெற்றிகரமாக முன்பதிவு செய்யப்பட்டது',
    'booking.download': 'டிக்கெட்டை பதிவிறக்கம் செய்க',
    'booking.bookAnother': 'மறு பதிவு செய்ய',
    'booking.saveId': ' எதிர்காலப் பயன்பாட்டிற்குப் உங்கள் பதிவு ஐடி சேமிக்கவும்',
    'booking.emailSent': 'பதிவு மின்னஞ்சல் அனுப்பப்பட்டது',
    'booking.emailFailed': 'மின்னஞ்சல் அஞ்சல் தோல்வியுற்றது, ஆனால் உங்கள் பதிவு உறுதியாக உள்ளது.',
    'selectRouteFirst': 'முதலில் வழியும் தேதியையும் தேர்வு செய்யவும்',
    'submit.failed': 'மற்றவர்கள் தற்போது உங்கள் தேர்ந்தெடுத்த இருக்கைகளை முன்பதிவு செய்திருக்கலாம். மீண்டும் தேர்வு செய்யவும்.',
    'hold.waiting': 'உங்கள் இடங்கள் பாதுகாக்கப்படுகிறது...',
  },
};

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  availableLocales: Locale[];
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const STORAGE_KEY = 'quickbus_locale';

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    const storedLocale = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (storedLocale && AVAILABLE_LOCALES.includes(storedLocale)) {
      setLocaleState(storedLocale);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale: (newLocale: Locale) => {
        if (AVAILABLE_LOCALES.includes(newLocale)) {
          setLocaleState(newLocale);
        }
      },
      t: (key: string) => {
        return TRANSLATIONS[locale][key] ?? TRANSLATIONS.en[key] ?? key;
      },
      availableLocales: AVAILABLE_LOCALES,
    }),
    [locale]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguageContext = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguageContext must be used within a LanguageProvider');
  }
  return context;
};
