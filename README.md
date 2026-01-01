# Audial

<img src="assets/logo.png" alt="Audial Logo" width="100" align="right" />

**LLM-written music**. Try it live: [aurial.dev](https://www.audial.dev/)

Music has shaped humanity since our beginning, pushing us towards futures once thought impossible.
Now it's time for AI to unlock what comes next.

And with all new things, there is much exciting work to be done here. **Upwards and onwards!**
<br>
<br>

<div align="center">
  <a href="https://www.youtube.com/watch?v=Nhqy4o57bl4">
    <img src="https://raw.githubusercontent.com/DorsaRoh/audial/main/assets/vid.png" alt="Watch Demo Video" width="600" />
  </a>
</div>



## Quickstart


```bash
# clone and install
git clone https://github.com/DorsaRoh/audial.git
cd audial
pnpm install   # or: npm install

# start the dev server
pnpm dev       # or: npm run dev
```

Open [http://localhost:3000](http://localhost:3000), click ⚙️ (settings), choose your model and enter your api key, and begin!

### **Get an API key:**
- [anthropic (claude)](https://console.anthropic.com/)
- [openai (gpt-4)](https://platform.openai.com/)


## Tips for Getting a Good Song

It is rare for a model to produce a great song on the first prompt. In practice, you have to **vibe** with the model!

What works:
- iterate, don't restart - refine the musical idea
- react to what it generates (for example, if a part is good, try asking it to expand it)
- let the model settle into a direction instead of forcing novelty every turn


### Note:
- Unless you explicitly provide the musical material (notes, structure, midi, code, etc.), the model **cannot reliably recreate specific existing works**.

   That means prompts like *"write a theme song for Game of Thrones"* will usually fail

   If you want accuracy, you must provide concrete musical constraits or examples

## This is only the beginning

There is much exciting work to be done. The future is bright!

