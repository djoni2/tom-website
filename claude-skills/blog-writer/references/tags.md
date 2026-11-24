# The tag taxonomy

Every article gets **exactly two** tags, both chosen from this list. The list is
the blog owner's taxonomy: never invent a tag to fit an article, and never
create one through the API. If nothing here fits, say so and let the user
decide.

Read the live list before tagging, since it can change:

```bash
curl -s -H "X-API-KEY: $(cat ~/.hyvor/console-key)"   "https://blogs.hyvor.com/api/console/v0/blog/dev-d287e71c-2526-4197-ae4c-a7f2efbf7c83/tags?limit=100"
```

## Choosing the two

- **One for the subject, one for the angle.** A story about a police campaign on
  the Via Rápida is `Crime` plus `traffic`, not `Crime` plus `Police
  Investigation`, which say the same thing twice.
- **The two must be distinct.** If the second tag only restates the first, pick
  a different axis: the place (`Funchal`, `Câmara de Lobos`, `Porto Santo`), the
  sector (`Economy`, `Tourism`, `Real Estate`), or the lens (`Society`,
  `Politics`, `History`).
- **Prefer the specific one** where it genuinely applies. `Praia Formosa` beats
  `Nature` for a story about that beach.
- Write them in the draft front matter by name, exactly as spelled here:
  `tags: [History, Tourism]`.

## The tags

| Tag | Slug | What it covers |
| --- | --- | --- |
| Accident | `accident` | On average, Madeira sees about one fatal accident per month. Stay informed about incidents across the island, … |
| Culture | `culture` | In-depth look at Madeira's heritage, traditions, and community life. Covering major events, milestones, and cu… |
| Politics | `politics` | Stay informed about the latest developments in Madeira's political landscape. Get breaking news on regional go… |
| Ukraine | `ukraine` | - |
| Praia Formosa | `praia-formosa` | Praia Formosa translates to "Beautiful beach", and it is more than that. Funchal's beloved pebble beach is Fun… |
| Rescue | `rescue` | - |
| Weather Forecast | `weather-forecast` | - |
| Câmara de Lobos | `camara-de-lobos` | With more than 40.000 inhabitants, Câmara de Lobos is the second largest city in Madeira. Stay up to date and … |
| History | `history` | From discovery in 1419 to the 1974 Revolution, explore Madeira's journey through the 'White Gold' sugar boom, … |
| Crime | `crime` | While Madeira is renowned for its safety, evolving dynamics have led to a rise in crime over the years. Keep i… |
| Ronaldo | `ronaldo` | Cristiano Ronaldo, or CR7, is considered a half-god in Madeira. It's the island's favorite son. Stay informed … |
| Nature | `nature` | - |
| Police Investigation | `police-investigation` | - |
| Reform | `reform` | - |
| Sao Vicente | `sao-vicente` | - |
| Economy | `economy` | Get the latest updates on Madeira's economic landscape, covering key sectors like tourism, retail, real estate… |
| Mortgage | `mortgage` | - |
| Education | `education` | - |
| Social Housing | `social-housing` | - |
| Employment | `employment` | - |
| Gastronomy | `gastronomy` | - |
| Christmas | `christmas` | - |
| Hiking | `hiking` | - |
| Alojamento Local | `alojamento-local` | - |
| Public Transport | `public-transport` | Stay informed about public transport in Madeira. Find the latest news on bus schedules, routes, and service up… |
| Record | `record` | - |
| Porto Santo | `porto-santo` | - |
| CO2 emission | `co2-emission` | - |
| Future | `future` | - |
| Climate transition | `climate-transition` | - |
| Tourism | `tourism` | With a resident population of around 257,000, Madeira welcomes over 2 million tourists annually, accounting fo… |
| Real Estate | `real-estate` | Madeira has seen crucial changes in the real estate market. Property prices and rentals went through the roof … |
| Society | `society` | Stay informed on Madeira's social landscape, from public safety and healthcare challenges to housing trends an… |
| traffic | `traffic` | Throughout the last decades, traffic has been increasing steadily in Madeira. Stay up-to-date on the latest ro… |
| Natural disaster | `natural-disaster` | - |
| NATO | `nato` | - |
| Airport | `airport` | Find the latest news about Cristiano Ronaldo International Airport (FNC). Get insights on tourist arrivals, ne… |
| Funchal | `funchal` | Experience Funchal's heartbeat with our breaking news coverage. Stay informed on politics, events, and the dyn… |

The dev blog also carries six seeded demo tags (`welcome`, `deserunt`,
`magnam`, `labore`, `fugiat`, `soluta`). Those are Hyvor sample data and are
never used on a real article.
