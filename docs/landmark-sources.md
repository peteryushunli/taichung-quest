# Landmark guide sources

Verified on 7 November 2026 using primary official tourism, museum and venue sources. Visitor descriptions are original short paraphrases. Hours, prices, ticket availability, current exhibitions and transport schedules are intentionally absent from the catalog.

## Data contract and game status

The catalog is `web/src/data/landmarks.json`. IDs are stable across the guide and its illustrations. English and Traditional Chinese names identify real places. `officialUrl` opens visitor information from a responsible institution or official tourism bureau; `officialSourceTitle` identifies the linked source.

`mapX` and `mapY` are agreed illustrative percentages on the compressed game overview. They preserve rough north/south and east/west relationships from the published locations while compressing distances and spacing markers for interaction. They are design coordinates, not street-navigation directions. The real-world latitude/longitude values are separate published landmark points and should not be treated as exact entrances.

Only Calligraphy Greenway has `playable: true` and `gameAreaRef: "MAP_PALLET_TOWN"`. This refers to the current small fictionalized Greenway neighborhood. It does not mean the full real-world Greenway has been reproduced. The other four cards are guide examples for planned areas and have null game-area references. None is an implemented gym, and this sample catalog does not finalize the future gym roster, leaders, badges or battle order. Basic visitor facts are available from the start.

## Calligraphy Greenway / 草悟道

- [Taichung Tourism and Travel Bureau: Calligraphy Greenway](https://travel.taichung.gov.tw/en/Attractions/Intro/1050) supports the corridor linking the science museum, Civic Square, Park Lane by CMP and the fine-arts museum.
- [Taichung Tourism and Travel Bureau: 草悟道](https://travel.taichung.gov.tw/zh-tw/Attractions/Intro/786/) identifies the Traditional Chinese name.
- [Taiwan Tourism Administration: Calligraphy Greenway](https://eng.taiwan.net.tw/m1.aspx?id=A12-00139&sNo=0002016) publishes the address on Xiangshang North Road and longitude/latitude `120.66477 / 24.148400`. The catalog stores latitude first in its named fields.
- Schematic guide position: `57 / 61`. The published location is a representative point on an extended corridor.

## Park Lane by CMP / 勤美誠品綠園道

- [Taichung Tourism and Travel Bureau: Park Lane by CMP](https://travel.taichung.gov.tw/en/attractions/intro/1352) supports its setting beside the Greenway, shopping/culture uses and planted walls.
- [Taichung Tourism and Travel Bureau: 勤美誠品綠園道](https://travel.taichung.gov.tw/zh-tw/Attractions/Intro/83/) supports the Traditional Chinese name and address at 68 Gongyi Road.
- [Park Lane by CMP: About](https://parklane.com.tw/about/en/) and [CMP Group: Retail](https://www.cmp.com.tw/en/business/lifestyle) corroborate shopping, dining, books and cultural activity.
- [Taichung City Government filming-location guide, appendix page 167](https://www.taichung.gov.tw/media/480932/%E4%BE%86%E5%8E%BB%E6%8B%8D%E5%8F%B0%E4%B8%AD-%E7%AC%AC11%E5%96%AE%E5%85%83%E8%87%B3%E9%99%84%E9%8C%84%E6%96%B0%E7%89%88.pdf) publishes `24°09′04.2″N, 120°39′50.3″E`. Conversion to decimal degrees, rounded to six decimal places, gives latitude `24.151167`, longitude `120.663972`. This older official guide supplies only the stable location point, not current visitor operations.
- Schematic guide position: `55 / 48`.

## National Taiwan Museum of Fine Arts / 國立臺灣美術館

- [Museum overview](https://www.ntmofa.gov.tw/en/cp.aspx?n=1579) supports the focus on modern/contemporary Taiwanese art, exhibitions and outdoor sculpture park.
- [Official Chinese homepage](https://www.ntmofa.gov.tw/) confirms the Traditional Chinese name.
- [Official visitor directions](https://www.ntmofa.gov.tw/en/cp.aspx?n=1585) confirms the address at 2, Section 1, Wuquan West Road.
- [Taiwan Tourism Administration: National Taiwan Museum of Fine Arts](https://eng.taiwan.net.tw/m1.aspx?id=450&sNo=0000208) publishes longitude/latitude `120.66331 / 24.141186`.
- Schematic guide position: `54 / 84`.

## National Museum of Natural Science / 國立自然科學博物館

- [Official English museum site](https://www.nmns.edu.tw/en/) lists Life Science, Human Cultures and Global Environment galleries and the Botanical Garden. Its Life Science description includes dinosaur exhibits; its garden description identifies native Taiwanese plants.
- [Official Chinese museum site](https://www.nmns.edu.tw/ch/) confirms the Traditional Chinese name.
- [Taiwan Tourism Administration: National Museum of Natural Science](https://eng.taiwan.net.tw/m1.aspx?id=2191&sNo=0002016) publishes the address at 1 Guanqian Road and longitude/latitude `120.66606 / 24.157233`. The museum's own footer map link corroborates the location.
- Schematic guide position: `62 / 31`.

## National Taichung Theater / 臺中國家歌劇院

- [Official architecture description](https://www.npac-ntt.org/en/about/architecture/design) identifies Toyo Ito, curved walls, connected sound-cave spaces and public architectural spaces.
- [Official venue homepage](https://www.npac-ntt.org/en) supplies its English and Traditional Chinese names and identifies the venue's performing-arts role.
- [Taiwan Tourism Administration: National Taichung Theater](https://eng.taiwan.net.tw/m1.aspx?id=a12-00133&sNo=0002016) publishes the address at 101, Section 2, Huilai Road and longitude/latitude `120.64030 / 24.162649`.
- Schematic guide position: `14 / 16`.

## Illustrations

Guide illustrations are original vectors produced for the application. No photographs or third-party artwork were downloaded or reused for this catalog.
