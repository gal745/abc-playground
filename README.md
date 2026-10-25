# ABC Playground

Sixteen short, talking phonics games for children aged 4–7 who are learning letters and their sounds.
No reading is needed: every instruction is spoken.

| Game | Skill |
| --- | --- |
| 🎈 Balloon Pop | Recognising letters and their sounds, then the pairs sh ch th oo ee (7 levels) |
| 🐶 First Sounds | Hearing the first sound in a word |
| 🃏 Letter Match | Matching capital and small letters |
| 🎵 Rhyme Time | Hearing rhymes |
| 🧱 Build a Word | Blending sounds into words (c‑a‑t → cat) |
| 🔢 Number Words | Counting, and spelling number words (one to ten) from jumbled letters |
| 🦖 Feed the Dino | Matching a sound to a picture that starts with it |
| ✏️ Trace It | Forming letters by tracing them with a finger |
| 🚂 Alphabet Train | Alphabet order and missing letters |
| 📅 Days of the Week | Spelling the days (the *day* ending is filled in) |
| 🗓️ Days in Order | Putting the seven days in order, from any starting day |
| 🔎 Which Word? | Reading short rhyming words that look alike (cat, hat, bat; pan, pin, pen) |
| 🎯 Middle Sound | Hearing the short vowel in the middle of a word (c**a**t, p**i**g) |
| 🧲 Join the Sounds | Blending letters into a word: a + t → at, c + a + t → cat |
| 🤝 Sound Pairs | Two letters that make one sound: sh, ch, th, oo, ee (then ck, ng, ai, ar, or) |
| 🧩 Finish the Word | Choosing the pair a word is missing: __ip, m__n, gr__n |

Every game has **5 levels**, except Balloon Pop, which has 7. Finishing a level unlocks the next one, and the dots on each game's button show progress.

**Printable sheets** (one paper activity per game) are in `printables/`, linked from the home screen and the Grown-ups corner.

`poster.html` is a wall poster of the short sounds and how letters join up — the five short vowels with their keyword, ten two-letter words, thirty-eight three-letter words grouped by vowel, and seventeen four-letter ones. Every word hides its picture until it is tapped, so the word has to be read first; tapping also sounds it out. It prints on two A4 pages, the four-letter words on the second. Linked from the home screen.

`pairs.html` is the second poster: the letter pairs that make a single sound, each with its words, plus five more pairs to meet later. Also one A4 page.

`sheets.html` is eight printable worksheets for pencil work — circle the pair, write the missing pair, draw a line to the picture, one box per sound, tick what you can hear, and three sheets of joining letters. The joining sheets share no words between them, the second starts with two-sound words, and the third ends with four-sound ones. Each prints on its own page, and **Make new sheets** picks different words so a fresh set can be printed each week.

`days.html` is a quiet page away from the games: the seven days of the week in order, each said aloud when tapped, plus a button that says them all. It is linked from the home screen.

## Players

The first screen asks **"Who's playing?"**. Each player has their own stars, levels and letter settings, saved on that device. Tap ➕ to add a player, or tap the player's name at the top of the home screen to switch.

A **personal link** like `https://gal745.github.io/abc-playground/?player=Sam&avatar=🦁` sets up that child on whichever phone or computer opens it. Copy it from the 🔗 button in the Grown-ups corner. Children's names are never stored in this code or on a server.

## Playing

Open `index.html` and turn the sound on. On a computer, **Microsoft Edge** has the most natural voices (including the child voices Maisie and Ana); Chrome's voices sound more robotic. Phones and tablets have good voices built in.

On a phone, once the games are online, use "Add to Home Screen" to get an app icon.

## Grown-ups corner

Press and hold the ⚙️ button on the home screen for one second. There you can:

- read a short "how to play together" guide
- choose which letters to practise (for example just *s a t p i n*)
- show letters as lowercase or capitals
- choose a British, American or Australian accent, the voice and the speed
- open all levels at once (handy for older children)
- download the printable sheets

Settings and stars are saved on the device being used.

## Your own voice (optional)

Put recordings named `a.mp3` … `z.mp3` in `audio/sounds/`. They replace the computer voice for those letters.

## Editing words

All words, pictures and rhymes are in `js/data.js`.
