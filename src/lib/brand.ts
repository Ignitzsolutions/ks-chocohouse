export const BRAND_NAME = "K S Choco House";
export const TAGLINE = "Ultimate Chocolate Destination";
export const DESCRIPTION =
  "Indulge in sweetness with our homemade customised cakes and chocolates.";
export const LOCATION = "Sastri Nagar, Proddatur";

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
