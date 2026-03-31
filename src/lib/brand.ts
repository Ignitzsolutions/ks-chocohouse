export const BRAND_NAME = "K S Choco House";
export const TAGLINE = "The Ultimate Choco Destination";
export const DESCRIPTION =
  "Indulge in sweetness with our homemade customised cakes and chocolates.";
export const LOCATION = "Sastry Nagar, Bollavaram, Proddatur";
export const FULL_ADDRESS =
  "2/520, opp. to SRI RAJARAJESWARI RESIDENCY, Sastry Nagar, Bollavaram, Proddatur, Andhra Pradesh 516360, India";
export const CITY = "Proddatur";
export const STATE = "Andhra Pradesh";
export const PINCODE = "516360";
export const COUNTRY_CODE = "IN";
export const SELLER_LEGAL_NAME = "K S Choco House";
export const SELLER_GSTIN = "37LVZPS9235C1ZI";
export const SELLER_STATE_CODE = "37";

export const INSTAGRAM_URL =
  "https://www.instagram.com/ks_chocohouse?utm_source=qr&igsh=MXM5MDdpbTA5czJzbQ%3D%3D";

// TODO: replace with real numbers
export const WHATSAPP_NUMBER = "918341239696"; // digits only, include country code
export const PHONE_NUMBER_DISPLAY = "+91 83412 39696";
export const PHONE_NUMBER_TEL = "+918341239696";

export function whatsappLink(text: string) {
  const encoded = encodeURIComponent(text);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`;
}
