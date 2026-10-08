# How The Tape Lore talks

**One line:** a sharp friend who trades, explaining something that once cost them money. Warm, dry, a bit funny,
exact with numbers. They've lost money too, so they're never smug about it.

Founder brief (2026-10-08): "the voice feels too AI generated... make it as human as possible. Add humor or any other
emotion that can instantly hook the audience."

## What the research says (and what we do with it)
| Finding | What we do |
|---|---|
| Viewers decide in the first ~3 seconds; finance viewers want a surprising number or a myth challenged, and a credible challenge to something they already believe pulls hardest. | Caption 1 hits a feeling they've had **plus** the number, over the payoff visual. Often it repeats the belief they hold, then the picture breaks it. |
| An unexpected visual beats a static text overlay in the first seconds. Logos and slow intros cost retention. | The hook is the visual doing something (the pit digging), never a title card. Branding waits for the end card. |
| Humor raises attention and engagement reliably. It helps memory only when it's **about the concept**: a stream of unrelated jokes lowered recall in a planetarium study, while concept-tied humor helped delayed recall. | One or two jokes per video, and the joke must *be* the lesson ("−90% needs +900%. Bring snacks." makes the size of the climb land). Never a joke that's just decoration. |
| Self-mocking humor makes a teacher approachable; mocking the audience backfires. Traders use gallows humor to deal with losses. | We laugh at the pain (ours, everyone's), never at the viewer, a named person or a company. "We've all done this." |
| AI copy gives itself away with heavy em dashes, "it's not X, it's Y", tidy lists of three, hedging, the same sentence length over and over, and polish with no personality. | `scripts/voice_check.py` blocks the phrases and caps the punctuation. The rest is on us: read it out loud. |
| Specific numbers and timeframes make claims feel real. | $10,000, not "your capital". "Fifteen years", not "a long time". |

Sources: [Animoto, first 3 seconds](https://animoto.com/blog/video-marketing/why-first-3-seconds-matter) ·
[Shorz, finance Shorts hooks](https://www.shorz.ai/blog/best-youtube-shorts-hooks-for-finance-creators) ·
[Perceed, hook A/B tests](https://www.perceedigital.com/insights/video-hooks-that-convert/) ·
[Humor and learning in a planetarium (1997)](https://www.informalscience.org/effect-humor-learning-planetarium) ·
[Auburn, professor humor and retention](https://auetd.auburn.edu/handle/10415/2243?show=full) ·
[Carleton, humour in teaching](https://carleton.ca/tls/wp-json/wp/v2/posts/2723) ·
[Benzinga, why traders laugh at losses](https://cdn3.benzinga.com/general/94907/why-do-commodity-traders-laugh-at-losses) ·
[Signs of AI-generated text](https://www.aidetectors.io/blog/how-to-tell-if-text-is-ai-written) ·
[Making AI-assisted copy sound human](https://quillbot.com/blog/frequently-asked-questions/how-do-you-make-ai-writing-sound-more-human/).
Most of this is practitioner evidence, not lab science; our own retention numbers overrule it once we have them.

## The rules
1. **Hook with a feeling, not a topic.** "Down 50%? Cool. Now you need +100%." beats "Loss recovery math explained".
2. **One emotion per video**, named in the spec (`"emotion"`): dread, then relief · "oh no, that's me" · the smug joy
   of being right · disbelief at a number · calm. The music and the snap pay it off.
3. **Humor is the lesson wearing a joke.** One or two lines, max. Dry beats wacky. If you cut the joke and nothing is
   lost from the lesson, cut it.
4. **Talk, don't present.** Contractions. Short lines. A fragment now and then. Mix one long sentence in with the short
   ones. "You" for the viewer, "we" for the channel. Read it aloud: if you wouldn't say it across a trading desk,
   rewrite it.
5. **Specific beats general.** Real amounts, real dates, real durations.
6. **Have a take.** "Boring is the point." No hedging pile-ups ("it's worth noting that, in many cases...").
7. **Call back.** The end can answer the first line.
8. **Still never:** hype, advice, P&L, urgency, guru tone, rocket/money emojis, a hook the video doesn't pay off, or a
   joke at a real person's expense. Every compliance rule in CLAUDE.md still applies.

## AI tells we don't write (checked by `scripts/voice_check.py`, config in `config/voice.yaml`)
- "It's not X, it's Y" / "not just" / "more than just".
- Stock phrases: delve, unlock, unleash, game-changer, navigate the, landscape, journey, elevate, seamless, robust,
  "here's the thing", "let's dive in", "buckle up", "in today's world", "at the end of the day", "the power of",
  "a testament to", "when it comes to", "crucial", "ever-evolving".
- Em dashes: none in captions; at most one per social post (the end card template is the only fixed one).
- Rhetorical setups: "The result?", "The catch?", "The kicker?", "Ever wondered".
- Lists of three when two would do. Every paragraph the same length. Ending on a moral.

## Before and after (Lore 001)
| Before | After |
|---|---|
| Lose half. What does it take to get **back**? | Down 50%? Cool. Now you just need **+100%**. |
| Now $5,000 is all that's left. | Now $5,000 has to do all the climbing. |
| −90% needs +900%. Ten times the fall. | −90% needs +900%. Bring snacks. |
| Getting back needed +353%. That took until 2015. | Getting back needed +353%. That took fifteen years. |
| The common mistake: up 50% undoes down 50%. | "Down 50%? I'll just make 50% back." |
| That's why risk comes first here. | Boring is the point. |

## Per platform
- **Captions (on screen):** ≤ 12 words a card, burned in. One joke, max two. No em dashes.
- **X:** one thought, a line break, the punchline. No hashtags in the post. The first reply is the real-world proof.
- **Instagram:** the first line is the hook (the feed cuts at about 125 characters). Short paragraphs. Numbers as a
  list. One light line. End with something worth doing ("send this to the friend who says 'it'll come back'"),
  never "follow for more". Then the disclaimer, then 3–5 hashtags.
- **YouTube:** title = the feeling + the number, plain words, and the video must pay it off. The description's first
  two lines are the hook; sources and the disclaimer stay.
- **Alt text** stays plain and descriptive. It's for people using screen readers, not a place for jokes.
