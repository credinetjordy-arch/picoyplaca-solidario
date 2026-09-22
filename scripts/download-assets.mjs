/**
 * Descarga fuentes e imágenes de LATAM Ecuador a public/ y src/assets/
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve('.');

const FILES = [
  // Fonts
  ['https://s.latamairlines.com/fonts/latam_sans_regular-webfont.woff', 'public/fonts/latam_sans_regular.woff'],
  ['https://s.latamairlines.com/fonts/latam_sans_regular_italic-webfont.woff', 'public/fonts/latam_sans_regular_italic.woff'],
  ['https://s.latamairlines.com/fonts/latam_sans_light-webfont.woff', 'public/fonts/latam_sans_light.woff'],
  ['https://s.latamairlines.com/fonts/latam_sans_light_italic-webfont.woff', 'public/fonts/latam_sans_light_italic.woff'],
  ['https://s.latamairlines.com/fonts/latam_sans_bold-webfont.woff', 'public/fonts/latam_sans_bold.woff'],
  ['https://s.latamairlines.com/fonts/latam_sans_bold_italic-webfont.woff', 'public/fonts/latam_sans_bold_italic.woff'],
  ['https://s.latamairlines.com/fonts/latam_sans_extended-webfont.woff', 'public/fonts/latam_sans_extended.woff'],

  // Logos
  ['https://s.latamairlines.com/images/header/logo/DesktopNegative.svg', 'public/images/logo-header.svg'],
  ['https://s.latamairlines.com/images/boreal/collections/v1/logos/latam/DescriptivePositive.svg', 'public/images/logo-positive.svg'],
  ['https://s.latamairlines.com/images/boreal/collections/v1/logos/partners/PCIDSSCompliantGreyscale.svg', 'public/images/pci.svg'],

  // Hero / promo
  ['https://www.latamairlines.com/content/dam/latamxp/sites/promociones/banner-principal/cl/inspiracional/inspiracional-megapromo-ene-2026.png.transform/xxl/image.png', 'public/images/hero-pattern.png'],
  ['https://www.latamairlines.com/content/dam/latamxp/sites/promociones/banner-principal/ec/EC_CYBERW34_ONSITE_BANNER_DK_409X273_DCTOMAX2.png', 'public/images/promo-cyber.png'],

  // Offers
  ['https://www.latamairlines.com/content/dam/latamxp/sites/destinos/ecuador/deals/CUE-deal.jpg', 'public/images/offers/cuenca.jpg'],
  ['https://www.latamairlines.com/content/dam/latamxp/sites/destinos/ecuador/deals/MEC-deal.jpg', 'public/images/offers/manta.jpg'],
  ['https://www.latamairlines.com/content/dam/latamxp/sites/destinos/ecuador/deals/GYE.jpg', 'public/images/offers/guayaquil.jpg'],
  ['https://www.latamairlines.com/content/dam/latamxp/sites/destinos/colombia/deals/bog-deals.jpg', 'public/images/offers/bogota.jpg'],
  ['https://www.latamairlines.com/content/dam/latamxp/sites/destinos/estados-unidos/deals/MIA-deals.jpg', 'public/images/offers/miami.jpg'],
  ['https://www.latamairlines.com/content/dam/latamxp/sites/destinos/brasil/deals/RIO-deals.jpg', 'public/images/hotels/rio.jpg'],
  ['https://www.latamairlines.com/content/dam/latamxp/sites/destinos/argentina/deals/AEP-deals.jpg', 'public/images/destinations/buenos-aires.jpg'],
  ['https://www.latamairlines.com/content/dam/latamxp/sites/destinos/ecuador/deals/GPS-deal.jpg', 'public/images/destinations/galapagos.jpg'],

  // Campaigns
  ['https://www.latamairlines.com/content/dam/latamxp/sites/promociones/zona-de-campa%C3%B1as/andean/2026/co/travel-aon/q3-2026/co_aonq3_julio_onsitemkt_home_heromb_584x248_d.jpg', 'public/images/campaigns/paquete.jpg'],
  ['https://www.latamairlines.com/content/dam/latamxp/sites/promociones/zona-de-campa%C3%B1as/andean/2026/co/travel-aon/q3-2026/co_aonq3_julio_onsitemkt_home_heromb_584x248_b.jpg', 'public/images/campaigns/hotel.jpg'],
  ['https://www.latamairlines.com/content/dam/latamxp/sites/promociones/zona-de-campa%C3%B1as/andean/2026/co/travel-aon/q3-2026/co_aonq3_julio_onsitemkt_home_heromb_584x248_a.jpg', 'public/images/campaigns/assist.jpg'],

  // More options
  ['https://s.latamairlines.com/images/home/more-options/packages.svg', 'public/images/more/packages.svg'],
  ['https://s.latamairlines.com/images/home/more-options/hotels.svg', 'public/images/more/hotels.svg'],
  ['https://s.latamairlines.com/images/home/more-options/cars.svg', 'public/images/more/cars.svg'],
  ['https://s.latamairlines.com/images/home/more-options/insurance.svg', 'public/images/more/insurance.svg'],

  // Login incentive
  ['https://s.latamairlines.com/images/home/login_incentive_background_desktop.png', 'public/images/pass/bg-desktop.png'],
  ['https://s.latamairlines.com/images/home/login_incentive_decoration_1.svg', 'public/images/pass/deco-1.svg'],
  ['https://s.latamairlines.com/images/home/login_incentive_decoration_2.svg', 'public/images/pass/deco-2.svg'],
  ['https://s.latamairlines.com/images/home/login_incentive_decoration_3.svg', 'public/images/pass/deco-3.svg'],

  // Experience
  ['https://s.latamairlines.com/images/home/value_proposition_slider1.jpg', 'public/images/experience/prepare.jpg'],
  ['https://s.latamairlines.com/images/home/value_proposition_slider2.jpg', 'public/images/experience/board.jpg'],
  ['https://s.latamairlines.com/images/home/value_proposition_slider3.jpg', 'public/images/experience/inflight.jpg'],

  // Credit card
  ['https://s.latamairlines.com/images/web-ancillaries/credit-card-banners/guayaquil-latampass.png', 'public/images/credit-card.png'],

  // App badges commonly used by LATAM
  ['https://s.latamairlines.com/images/footer/google-play.svg', 'public/images/google-play.svg'],
  ['https://s.latamairlines.com/images/footer/app-store.svg', 'public/images/app-store.svg'],
];

async function download(url, dest) {
  const abs = path.join(ROOT, dest);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Referer: 'https://www.latamairlines.com/ec/es',
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(abs, buf);
  console.log('OK', dest, buf.length);
}

async function main() {
  for (const [url, dest] of FILES) {
    try {
      await download(url, dest);
    } catch (err) {
      console.warn('FAIL', dest, err.message);
    }
  }
}

main();
