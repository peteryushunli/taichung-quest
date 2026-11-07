# Landmark guide sources

Verified on 7 November 2026 using primary official tourism, museum and venue sources. Visitor descriptions are original short paraphrases. Hours, prices, ticket availability, current exhibitions and transport schedules are intentionally absent from the catalog.

## Data contract and game status

The catalog is `web/src/data/landmarks.json`. The ten approved stable IDs, bilingual names/descriptions/addresses, district, game references, readiness and schematic anchors live in that one file. `officialUrl` opens visitor information from a responsible institution or official tourism bureau; optional `officialUrlZh` supplies a Chinese counterpart. `officialSourceTitle` identifies the source. CMP is context within the Greenway entry, not an eleventh marker.

`mapX` and `mapY` follow the compiled mapper's `docs/taichung-city-contract.json`, used by the integrated native city build. Three outdoor districts occupy a stitched 120×120-tile overview: Xitun origin `(0,0)`, Greenway `(40,32)`, Old City `(80,48)`. For each entrance anchor, overview percentages are `8 + 84 × (worldOrigin + localCoordinate) / 120`. The native exterior, layout and hall IDs are retained in the catalog. These are compressed game coordinates, not street directions; real latitude/longitude values are separate published representative points, not exact door entrances.

Parent integration `5724337` compiled all three districts and ten visitor halls together. All ten areas are marked explorable; game artwork and interiors remain provisional. Station is the arrival area. Parent verified the actual Station battle victory and City Pass result in canonical ROM `1ee115af`; its challenge is marked playable with an explicit provisional leader/team note. Other nine gym challenges are `planned`; leaders and teams are undecided. No visited/player/badge/progression state is invented by this browser guide. Visitor facts are available before Play.

The catalog order also matches native City Pass bit order: Station, Park, Miyahara, Science Museum, Greenway/Civic Square, Shen Ji, Fine Arts, Fengjia, Maple Garden, Theater. Public facts and guide artwork do not define native battle teams.

## Old Taichung Station / 舊臺中車站

- [Official railway cultural park page](https://travel.taichung.gov.tw/en/attractions/intro/1942) supports the historic red-brick station/clock tower, railway heritage and cultural-park setting beside the modern station.
- [Official historic station entry](https://travel.taichung.gov.tw/en/Attractions/Intro/1568) corroborates the preserved station building.
- The tourism page publishes the address at 1, Section 1, Taiwan Boulevard, Central District and coordinate metadata latitude `24.13678`, longitude `120.68501`. Its map destination agrees.

## Taichung Park / 臺中公園

- [Official park entry](https://travel.taichung.gov.tw/en/attractions/intro/882) supports the historic park, lake, arched bridges and Mid-Lake Pavilion.
- The official address is 65, Section 1, Shuangshi Road, North District. Published coordinate metadata: latitude `24.14431`, longitude `120.68571`.

## Miyahara / 宮原眼科

- [Official English visitor entry](https://travel.taichung.gov.tw/en/Attractions/Intro/1239) and [Chinese entry](https://travel.taichung.gov.tw/zh-tw/Attractions/Intro/793) support the former eye clinic, restored red-brick facade/archway, pastries, ice cream and tall bookcase-lined interior.
- Address: 20 Zhongshan Road, Central District. Official coordinate metadata: latitude `24.13784`, longitude `120.68356`.

## Shen Ji New Village / 審計新村

- [Official English visitor entry](https://travel.taichung.gov.tw/en/Attractions/Intro/1222) and [Chinese entry](https://travel.taichung.gov.tw/zh-tw/attractions/intro/1139) support the former auditing-office employee housing and its reuse for young entrepreneurs, independent shops and creative activity.
- Address: Lane 368, Minsheng Road, West District. Official coordinate metadata: latitude `24.14493`, longitude `120.66261`.

## Fengjia Night Market / 逢甲夜市

- [Official night-market entry](https://travel.taichung.gov.tw/en/Attractions/Intro/850) supports its location around Feng Chia University and concentration of snack stalls, clothing shops and lively lanes.
- The place is a district around the university, rather than a single shop address. Official coordinate metadata: latitude `24.17951`, longitude `120.64632`.

## Maple Garden / 秋紅谷

- [Official English entry](https://travel.taichung.gov.tw/en/attractions/intro/851) and [Chinese entry](https://travel.taichung.gov.tw/zh-tw/attractions/intro/818) support the sunken urban park, lake, greenery and observation bridge beside Taiwan Boulevard.
- The Chinese entry provides the full address at the intersection of Shizheng North 7th Road and Section 3, Henan Road, Xitun District. Official coordinate metadata: latitude `24.16801`, longitude `120.63935`.

For these six tourism entries, representative coordinates were read from the official HTML `place:location:latitude`/`longitude` metadata and cross-checked against map destinations. Descriptions in both languages are original short paraphrases.

## Calligraphy Greenway / 草悟道

- [Taichung Tourism and Travel Bureau: Calligraphy Greenway](https://travel.taichung.gov.tw/en/Attractions/Intro/1050) supports the corridor linking the science museum, Civic Square, Park Lane by CMP and the fine-arts museum.
- [Taichung Tourism and Travel Bureau: 草悟道](https://travel.taichung.gov.tw/zh-tw/Attractions/Intro/786/) identifies the Traditional Chinese name.
- [Taiwan Tourism Administration: Calligraphy Greenway](https://eng.taiwan.net.tw/m1.aspx?id=A12-00139&sNo=0002016) publishes the address on Xiangshang North Road and longitude/latitude `120.66477 / 24.148400`. The catalog stores latitude first in its named fields.
- Schematic guide position: `51.4 / 55.6`, from the native Greenway entrance. The published geographic location is a representative point on an extended corridor.

## Greenway context: Park Lane by CMP / 勤美誠品綠園道

- [Taichung Tourism and Travel Bureau: Park Lane by CMP](https://travel.taichung.gov.tw/en/attractions/intro/1352) supports its setting beside the Greenway, shopping/culture uses and planted walls.
- [Taichung Tourism and Travel Bureau: 勤美誠品綠園道](https://travel.taichung.gov.tw/zh-tw/Attractions/Intro/83/) supports the Traditional Chinese name and address at 68 Gongyi Road.
- [Park Lane by CMP: About](https://parklane.com.tw/about/en/) and [CMP Group: Retail](https://www.cmp.com.tw/en/business/lifestyle) corroborate shopping, dining, books and cultural activity.
- [Taichung City Government filming-location guide, appendix page 167](https://www.taichung.gov.tw/media/480932/%E4%BE%86%E5%8E%BB%E6%8B%8D%E5%8F%B0%E4%B8%AD-%E7%AC%AC11%E5%96%AE%E5%85%83%E8%87%B3%E9%99%84%E9%8C%84%E6%96%B0%E7%89%88.pdf) publishes `24°09′04.2″N, 120°39′50.3″E`. Conversion to decimal degrees, rounded to six decimal places, gives latitude `24.151167`, longitude `120.663972`. This older official guide supplies only the stable location point, not current visitor operations.
- This research supports the Greenway visitor copy. CMP is folded into that entry, without its own game marker or City Pass slot.

## National Taiwan Museum of Fine Arts / 國立臺灣美術館

- [Museum overview](https://www.ntmofa.gov.tw/en/cp.aspx?n=1579) supports the focus on modern/contemporary Taiwanese art, exhibitions and outdoor sculpture park.
- [Official Chinese homepage](https://www.ntmofa.gov.tw/) confirms the Traditional Chinese name.
- [Official visitor directions](https://www.ntmofa.gov.tw/en/cp.aspx?n=1585) confirms the address at 2, Section 1, Wuquan West Road.
- [Taiwan Tourism Administration: National Taiwan Museum of Fine Arts](https://eng.taiwan.net.tw/m1.aspx?id=450&sNo=0000208) publishes longitude/latitude `120.66331 / 24.141186`.
- Schematic guide position: `43 / 73.8`, from the native Fine Arts entrance.

## National Museum of Natural Science / 國立自然科學博物館

- [Official English museum site](https://www.nmns.edu.tw/en/) lists Life Science, Human Cultures and Global Environment galleries and the Botanical Garden. Its Life Science description includes dinosaur exhibits; its garden description identifies native Taiwanese plants.
- [Official Chinese museum site](https://www.nmns.edu.tw/ch/) confirms the Traditional Chinese name.
- [Taiwan Tourism Administration: National Museum of Natural Science](https://eng.taiwan.net.tw/m1.aspx?id=2191&sNo=0002016) publishes the address at 1 Guanqian Road and longitude/latitude `120.66606 / 24.157233`. The museum's own footer map link corroborates the location.
- Schematic guide position: `52.8 / 44.4`, from the native Science Museum entrance.

## National Taichung Theater / 臺中國家歌劇院

- [Official architecture description](https://www.npac-ntt.org/en/about/architecture/design) identifies Toyo Ito, curved walls, connected sound-cave spaces and public architectural spaces.
- [Official venue homepage](https://www.npac-ntt.org/en) supplies its English and Traditional Chinese names and identifies the venue's performing-arts role.
- [Taiwan Tourism Administration: National Taichung Theater](https://eng.taiwan.net.tw/m1.aspx?id=a12-00133&sNo=0002016) publishes the address at 101, Section 2, Huilai Road and longitude/latitude `120.64030 / 24.162649`.
- Schematic guide position: `16.4 / 38.8`, from the native Theater entrance.

## Illustrations

All ten field sketches are original vectors in `web/src/landmark-art.ts`. They include the station clock tower, twin park pavilions, Miyahara's brick arches, science-museum greenhouse, Greenway trees, Shen Ji housing, art museum, market stalls, sunken garden and flowing theater facade. These guide illustrations are distinct from the provisional native game tiles. No photographs or third-party artwork were downloaded or reused for this catalog.
