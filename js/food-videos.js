/* ---------- recipe videos ----------
   Hand-picked instruction videos, each one checked against YouTube's oEmbed
   endpoint so the id, title and channel here are real. Recipes without an
   entry simply show no video — a search link is not an instruction video.
   Embedded through youtube-nocookie, and only after the viewer presses play. */
const FOOD_VIDEOS = {
  aaruul:{v:'rMBryjUdZIk', title:'Nargie\'s Mongolian Cuisine: AARUUL (The Most Popular Mongolian Dairy Product)', by:'ARTGER'},
  bantan:{v:'4TAvMGSAq8U', title:'Mongolian Cuisine: Bantan - Hangover Soup (In Mongolian and English)', by:'Chef Rafi\'s Awesome World'},
  boortsog:{v:'5S3IgsvVJBQ', title:'How to Make Boortsog (Mongolian Fried Pastries)', by:'Ayuhan\'s Kitchen'},
  buuz:{v:'pktdRU-MMGM', title:'Дрожгүй мантуун бууз хэрхэн хийх вэ?', by:'Янживын Батзаяа'},
  friedbansh:{v:'2CvGGm_O8-U', title:'Дүрлэгтэй шарсан банш - goodmom', by:'Goodmaam'},
  friedrice:{v:'_FyY1aThb-E', title:'How to Make Mongolian Beef Fried Rice - The Easiest Fried Rice (recipe)', by:'Omnivore\'s Cookbook'},
  huushuur:{v:'oKupl0dtPTg', title:'Хуушуур хэрхэн хийх вэ? 2020 жор | khuushuur yummy', by:'2NN Family'},
  khorkhog:{v:'IGJ-0X9vt8Q', title:'KHORKHOG - Real Mongolian Barbeque', by:'Roots of Mongolia'},
  milktea:{v:'5MxUhIFxZWk', title:'Mongolian Milk Tea (Suutei Tsai)', by:'Dinner By Dennis'},
  noodlesoup:{v:'ns69c-iDZiU', title:'Guriltai Shul Recipe with Chef Ranveer Brar', by:'Love Food'},
  tsuivan:{v:'TrxWA62uXCM', title:'How to make Mongolian Tsuivan (Цуйван) by Snowy', by:'Michael Powell'},
  zutan:{v:'TlRqt1tTOqo', title:'Мөөгний зутан шөл Home cooking ( Muugnii zutan shul )', by:'enkhbold batjargal'},
};
function foodVideo(id){ return FOOD_VIDEOS[id] || null; }
