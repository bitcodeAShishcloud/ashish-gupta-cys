export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  date: string;
  readTime: string;
  image?: string;
  /** Intrinsic image dimensions, used to reserve exact layout boxes (zero CLS). */
  imageWidth?: number;
  imageHeight?: number;
  content: string; // markdown
}

export const BLOG_POSTS: BlogPost[] = [
  {
    id: "poppit-ai-gemma-2b-qlora",
    title: "Fine-Tuning Gemma 2B with QLoRA: Building Poppit AI",
    excerpt:
      "How I turned Google's Gemma 2B into my own assistant: 4-bit NF4 quantization, LoRA on the attention projections, TRL's SFTTrainer, and a FastAPI + vanilla-JS chat stack around it.",
    category: "Projects",
    tags: ["QLoRA", "Gemma 2B", "PEFT", "PyTorch", "FastAPI"],
    date: "2026-09-27",
    readTime: "8 min read",
    image: "/blog-images/poppit-ai.webp",
    content: `
**Poppit AI** is a conversational assistant I built end to end: a fine-tuned [Gemma 2B](https://huggingface.co/google/gemma-2b) served through a FastAPI backend, with a custom ChatGPT-style UI on top. The full source lives at [github.com/bitcodeAShishcloud/Poppit-Ai](https://github.com/bitcodeAShishcloud/Poppit-Ai) and the web UI is hosted on GitHub Pages.

## Why fine-tune a 2B model
I wanted to own the whole pipeline, not just call an API: pick a base model, shape its behavior with my own instruction-response data, quantize it so it fits in consumer VRAM, and wrap it in a server and UI I wrote myself. A 2B model is small enough that the fine-tuned adapter is only a few megabytes, and inference runs in around 4GB of VRAM.

## The QLoRA pipeline
QLoRA freezes the base model in 4-bit and trains small low-rank adapters on top. The setup in \`train.py\`:

\`\`\`python
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_use_double_quant=True,
)

lora_config = LoraConfig(
    r=8,
    lora_alpha=16,
    lora_dropout=0.05,
    target_modules=["q_proj", "v_proj"],
    bias="none",
    task_type="CAUSAL_LM",
)
\`\`\`

NF4 with **double quantization** squeezes the base weights hard, and adapters on the query and value projections are enough to steer a 2B model. \`model.print_trainable_parameters()\` showed how few parameters were actually training, which is the whole point of the method.

## Dataset and prompt format
Training data is a JSON file of instruction-response pairs, formatted with the classic template before reaching the trainer:

\`\`\`
### Instruction:
{question}

### Response:
{answer}
\`\`\`

Keeping the format identical between training and inference matters more than any hyperparameter. The inference script wraps every user prompt in the same template, otherwise the adapter behaves unpredictably.

## Training configuration
The trainer is TRL's \`SFTTrainer\`:

- batch size 1 with gradient accumulation 4 (small-VRAM friendly)
- learning rate 2e-4, 3 epochs
- \`adamw_torch\`, checkpoints every 50 steps
- AMP disabled and \`max_grad_norm\` set to 0, which worked around a gradient-scaling quirk on Windows

Each checkpoint is tiny (the final adapter is on the order of 10MB), so experimenting across runs is cheap. A small dataset trains in tens of minutes on a modest GPU.

## Inference and serving
At runtime the adapter is mounted back onto the fp16 base with PEFT. Generation samples with temperature 0.7, top-p 0.9 and a repetition penalty of 1.2, capped at 150 new tokens. A FastAPI server exposes two endpoints:

- \`POST /chat\` — the message in, the response out
- \`POST /like\` — saves a liked instruction-response pair to \`like.json\`, which becomes training data for the next run

That like-button feedback loop is my favorite part: the UI quietly feeds the next fine-tune.

## The chat UI
The frontend is vanilla JavaScript (no framework) with multi-session chat, pinning and search, auto-growing input with arrow-key history, code blocks with copy buttons, voice input via the Web Speech API, and encrypted localStorage persistence. It is deployed on GitHub Pages, so the only thing that needs a GPU is the backend.

## What I learned
Quantization math is the easy part; the hard parts are prompt-format discipline, dataset quality, and Windows-specific training quirks. And a feedback loop beats a bigger dataset: rows you know are good are worth more than rows you hope are good.
`,
  },
  {
    id: "building-news-aggregator",
    title: "How I Built a Full-Stack News Aggregator with PHP and MySQL",
    excerpt:
      "A walkthrough of my News Aggregator project, pulling articles from NewsAPI, storing them in MySQL, and serving a clean feed with user accounts.",
    category: "Projects",
    tags: ["PHP", "MySQL", "JavaScript", "API"],
    date: "2026-05-08",
    readTime: "6 min read",
    image: "/blog-images/news-aggregator.webp",
    imageWidth: 1024,
    imageHeight: 1024,
    content: `
One of the projects I'm most proud of is my **News Aggregator**, a full-stack web application that fetches the latest technology news from NewsAPI, stores articles in a MySQL database, and presents them in a clean, browsable feed with user authentication.

## Why I Built It
I wanted a single place to read tech news without jumping between dozens of websites. I also wanted to practice building a proper full-stack application with a real database, user accounts, and API integration.

## Tech Stack
- **Backend**, PHP for server-side logic and API communication.
- **Database**, MySQL for storing fetched articles, user accounts, and preferences.
- **Frontend**, HTML, CSS, and JavaScript for a responsive user interface.
- **API**, NewsAPI for pulling the latest articles in real time.

## How It Works
### 1. Fetching Articles
A PHP script makes requests to the NewsAPI endpoint for technology articles. The response is parsed and each article's title, description, source, URL, and thumbnail are stored in the MySQL database:

\`\`\`php
$url = "https://newsapi.org/v2/top-headlines?category=technology&apiKey=" . $apiKey;
$response = file_get_contents($url);
$data = json_decode($response, true);

foreach ($data['articles'] as $article) {
    // Insert into database, skip duplicates
    $stmt = $pdo->prepare("INSERT IGNORE INTO articles ...");
    $stmt->execute([...]);
}
\`\`\`

### 2. User Authentication
Users can register and log in. Passwords are hashed with \`password_hash()\` and verified with \`password_verify()\`. Sessions keep users logged in across pages.

### 3. The Feed
The homepage pulls articles from the database sorted by date and renders them as cards. JavaScript handles lazy loading and smooth interactions without full page reloads.

## Challenges Faced
- **Rate limits**, NewsAPI's free tier has a request cap. I implemented caching so articles are only fetched every 15 minutes.
- **Duplicate prevention**, Used \`INSERT IGNORE\` and unique constraints on article URLs to avoid storing the same article twice.
- **Responsive design**, Making the card layout look good on both desktop and mobile took several iterations.

## What I Learned
This project taught me how to work with third-party APIs, design database schemas, handle user authentication securely, and build a responsive frontend. It was my first real full-stack project and gave me confidence to tackle bigger challenges.
`,
  },
  {
    id: "live-compiler-pro-real-time-collaboration",
    title: "Live Compiler Pro: Building a Real-Time Code Editor with WebRTC",
    excerpt:
      "Behind the scenes of Live Compiler Pro, real-time collab rooms, live chat with photo sharing, and WebRTC-based code editing in the browser.",
    category: "Projects",
    tags: ["JavaScript", "Node.js", "Socket.io", "WebRTC"],
    date: "2026-05-05",
    readTime: "10 min read",
    image: "/blog-images/live-compiler-pro.webp",
    imageWidth: 2560,
    imageHeight: 1600,
    content: `
**Live Compiler Pro** is a browser-based IDE at [live-code-hxft.onrender.com](https://live-code-hxft.onrender.com/) that supports multi-language editing, live preview, a built-in console, and real-time collaboration, ideal for pair programming, demos, and teaching.

## The Idea
During college, I often wanted to code with friends remotely. Existing tools were either too heavy or required installations. I wanted something lightweight that works right in the browser, open the app, share a room code, and start coding together.

## Core Features
- **Multi-language editor**, HTML, CSS, JavaScript, Python, JSON, and Markdown with syntax highlighting.
- **Live preview**, Run code manually or switch to Auto Run for instant HTML/CSS/JS updates.
- **Built-in console**, View logs, warnings, and errors; run JavaScript from the console input.
- **Files & export**, Create files, import from disk, rename tabs, and export as ZIP or individual files.
- **Theme toggle**, Dark and light modes for comfortable long sessions.
- **Code snippets**, Quick templates to bootstrap common patterns.

## Live Collaboration (Collab)
The **Collab** button in the header opens the **Live Collaboration** panel, the heart of real-time pair programming in Live Compiler Pro. You can code together with classmates or teammates without installing anything extra.

### Two ways to collaborate
- **Anywhere (P2P)**, Connect with others over the internet using peer-to-peer networking. Best when you and your partner are on different networks or cities. The host sees a status badge (*Connected* / *Host*) and a shareable room code.
- **Same Browser**, Mirror code across tabs in the same browser with **Tab Sync**. Handy for testing responsive layouts or comparing two versions side by side without a network room.

### How a live room works
1. Click **Collab** in the toolbar, then choose a username (shown to others in the room).
2. **Create & Join Room**, you become the host and receive a **12-character room code** (for example \`HGAH1QTS29ST\`).
3. Share the code via **Copy invite & share**, teammates paste it under **Join a room** and click **Join**.
4. Everyone edits the same workspace in real time while the **Chat** sidebar stays open for live discussion.
5. Hosts can **Reconnect** if the session drops or **Leave Room** to end their participation.

### Live Chat inside Collab rooms
Collaboration is not just shared code, you also get a built-in **Chat** panel on the left so you never have to switch to WhatsApp or Discord mid-debug. On [Live Compiler Pro](https://live-code-hxft.onrender.com/), chat is tied directly to the active room: text and images stay in the same thread as your live coding session.

## Architecture
### Backend
The server is built with **Node.js** and **Express**. Socket.io handles the WebSocket connections for real-time events:

\`\`\`js
const io = require('socket.io')(server);

io.on('connection', (socket) => {
    socket.on('code-change', (data) => {
        // Broadcast to all other users in the same room
        socket.to(data.room).emit('code-update', data.code);
    });

    socket.on('chat-message', (msg) => {
        io.to(msg.room).emit('new-message', msg);
    });
});
\`\`\`

### Frontend
The editor uses a code editor component with syntax highlighting. Changes are captured on every input event and emitted through Socket.io. Incoming updates are applied without disrupting the local user's cursor position.

## Challenges
- **Conflict resolution**, When two users edit the same line simultaneously, changes can clash. I implemented a simple last-write-wins strategy which works well for small teams.
- **Cursor management**, Applying remote changes without jumping the local cursor was tricky. I track cursor offsets before and after applying updates.
- **Room management**, Each collaboration session gets a unique room ID. Users join by appending it to the URL.

## What I Learned
This project deepened my understanding of WebSockets, real-time event architectures, and the challenges of collaborative editing. It also taught me how to structure a Node.js application for scalability.
`,
  },
  {
    id: "files-shorter-google-drive-uploader",
    title: "Files Shorter: A Client-Side File Organizer for Google Drive",
    excerpt:
      "How I built a zero-server file uploader that organizes uploads into Google Drive folders by subject, using just HTML and JavaScript.",
    category: "Projects",
    tags: ["Google Drive API", "JavaScript", "HTML", "Serverless"],
    date: "2026-05-01",
    readTime: "5 min read",
    image: "/blog-images/files-shorter.webp",
    imageWidth: 1024,
    imageHeight: 1024,
    content: `
**Files Shorter** is a lightweight, client-side web application that lets users upload files directly to Google Drive, automatically organizing them into folders by subject or category. No backend server required.

## The Problem
In college, we constantly share notes, assignments, and resources. Files end up scattered across WhatsApp groups, email threads, and random folders. I wanted a simple tool where anyone could upload a file, pick a subject, and have it automatically land in the right Google Drive folder.

## How It Works
1. The user selects a subject from a dropdown menu.
2. They pick one or more files to upload.
3. The app authenticates with Google Drive using the Google API client library.
4. Files are uploaded directly to the corresponding folder in Drive.

### Key Code: Uploading to a Specific Folder
\`\`\`js
function uploadFile(file, folderId) {
    const metadata = {
        name: file.name,
        parents: [folderId]  // Target folder in Drive
    };

    const form = new FormData();
    form.append('metadata', new Blob(
        [JSON.stringify(metadata)],
        { type: 'application/json' }
    ));
    form.append('file', file);

    return fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + accessToken },
            body: form
        }
    );
}
\`\`\`

## Design Decisions
- **No backend**, Everything runs in the browser. The Google API client handles authentication via OAuth2.
- **Predefined folders**, Subject folders are created in advance on Drive. The app maps subject names to folder IDs.
- **Simple UI**, A clean, minimal interface that anyone can use without instructions.

## What I Learned
Working with the Google Drive API taught me about OAuth2 flows, multipart file uploads, and the importance of keeping things simple. The entire app is under 200 lines of JavaScript.
`,
  },
  {
    id: "security-showcase-xss-prevention-demo",
    title: "Security Showcase: Demonstrating XSS Prevention in the Browser",
    excerpt:
      "A deep dive into my Security Showcase project, a hands-on demo of DOM-based XSS attacks and the defense techniques that stop them.",
    category: "Projects",
    tags: ["XSS Prevention", "JavaScript", "Frontend Security", "CSP"],
    date: "2026-04-25",
    readTime: "6 min read",
    image: "/blog-images/security-showcase.webp",
    imageWidth: 1024,
    imageHeight: 1024,
    content: `
My **Security Showcase** project is a frontend-only demonstration of common DOM-based Cross-Site Scripting (XSS) attacks and the layered defenses that prevent them. It's designed as an educational tool for students learning web security.

## What It Demonstrates
The app has two modes:
- **Vulnerable Mode**, Shows how unsafe DOM manipulation (like using \`innerHTML\` with user input) creates XSS vulnerabilities.
- **Protected Mode**, Demonstrates the same functionality with proper defenses in place, showing that security doesn't have to break usability.

## Defense Layers Implemented
### 1. Safe DOM Rendering
Replacing \`innerHTML\` with \`textContent\` for user-provided strings eliminates the most common XSS vector:

\`\`\`js
// Vulnerable
element.innerHTML = userInput;

// Safe
element.textContent = userInput;
\`\`\`

### 2. Input Sanitization
When HTML rendering is necessary (e.g., a rich text preview), the input is passed through a sanitization function that strips script tags, event handlers, and dangerous attributes.

### 3. Content Security Policy (CSP)
The app sets a strict CSP via a meta tag that blocks inline scripts and restricts script sources:

\`\`\`html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self'">
\`\`\`

### 4. Visual Feedback
When an XSS attempt is detected and blocked, the UI shows a red alert banner explaining what happened and why it was stopped. This makes the demo educational rather than just functional.

## Why I Built It
Most XSS tutorials only explain the theory. I wanted to build something where you can actually try an attack, see it work in vulnerable mode, then switch to protected mode and see the same attack fail. Learning by doing is far more effective.

## What I Learned
This project forced me to truly understand how browsers parse and execute scripts, how the DOM works at a low level, and how each defense layer contributes to overall security. It's one of the most educational projects I've done.
`,
  },
  {
    id: "banking-shopping-system-python",
    title: "Building a Secure Banking & Shopping System in Python",
    excerpt:
      "The story behind my Python desktop application featuring transaction processing, user authentication, and inventory management with security at its core.",
    category: "Projects",
    tags: ["Python", "Desktop App", "Security", "Authentication"],
    date: "2026-04-20",
    readTime: "6 min read",
    content: `
The **Banking Shopping System** is a desktop application I built in Python that combines banking operations with a shopping experience. Users can create accounts, deposit and withdraw funds, browse products, and make purchases, all with security features baked in from the start.

## Core Features
- **User Authentication**, Account creation with hashed passwords and secure login.
- **Banking Operations**, Deposit, withdraw, check balance, and view transaction history.
- **Shopping System**, Browse an inventory catalog, add items to cart, and checkout using account balance.
- **Transaction Logging**, Every financial operation is logged with timestamps for audit trails.

## Security Implementation
### Password Hashing
User passwords are never stored in plain text. I use Python's \`hashlib\` library to hash passwords before storage:

\`\`\`python
import hashlib

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(input_pw, stored_hash):
    return hash_password(input_pw) == stored_hash
\`\`\`

### Input Validation
Every user input is validated before processing. Withdrawal amounts are checked against the current balance, and negative values are rejected:

\`\`\`python
def withdraw(account, amount):
    if amount <= 0:
        print("Invalid amount.")
        return False
    if amount > account['balance']:
        print("Insufficient funds.")
        return False
    account['balance'] -= amount
    log_transaction(account['id'], 'WITHDRAW', amount)
    return True
\`\`\`

### Transaction Integrity
Each transaction is recorded with a unique ID, timestamp, type (deposit/withdraw/purchase), and amount. This creates a complete audit trail that can be reviewed at any time.

## Architecture
- **auth.py**, Handles user registration, login, and password management.
- **banking.py**, Manages accounts, deposits, withdrawals, and balance inquiries.
- **shop.py**, Handles the product catalog, cart, and checkout flow.
- **main.py**, The entry point with a menu-driven interface.

## Challenges
- **Data persistence**, Without a database, I used JSON files to store account data. This required careful file handling to prevent corruption during concurrent writes.
- **Menu flow**, Designing an intuitive CLI menu that guides users through banking and shopping without confusion took multiple iterations.
- **Edge cases**, Handling scenarios like insufficient funds during checkout, empty cart submissions, and invalid product IDs required thorough testing.

## What I Learned
This was my first significant Python project. It taught me about modular code design, secure data handling, and the importance of thinking about edge cases and error handling from the beginning, not as an afterthought.
`,
  },
  {
    id: "understanding-xss-prevention",
    title: "Understanding and Preventing Cross-Site Scripting (XSS)",
    excerpt:
      "A practical guide to identifying, exploiting, and defending against DOM-based XSS vulnerabilities in modern web applications.",
    category: "Web Security",
    tags: ["XSS", "Frontend Security", "JavaScript"],
    date: "2026-05-20",
    readTime: "6 min read",
    content: `
Cross-Site Scripting (XSS) remains one of the most common web application vulnerabilities. It allows attackers to inject malicious scripts into web pages viewed by other users, potentially stealing cookies, session tokens, or other sensitive information.

## What is XSS?
XSS occurs when an application includes untrusted data in a web page without proper validation or escaping. There are three main types:
- **Stored XSS**, The malicious script is permanently stored on the target server (e.g., in a database).
- **Reflected XSS**, The script is reflected off a web server in error messages, search results, or any response that includes input from a user.
- **DOM-based XSS**, The vulnerability exists entirely in client-side code. The attack payload is executed by modifying the DOM in the victim's browser.

## A Simple Example
Consider a search page that displays the user's query:

\`\`\`js
// Vulnerable code, DO NOT USE
document.getElementById('results').innerHTML =
    'You searched for: ' + userInput;
\`\`\`

If \`userInput\` contains \`<img src=x onerror=alert('XSS')>\`, the browser will execute the attacker's script.

## Prevention Techniques
### 1. Escape Output
Always escape user input before rendering it in HTML. Use \`textContent\` instead of \`innerHTML\` when inserting plain text:

\`\`\`js
// Safe approach
document.getElementById('results').textContent =
    'You searched for: ' + userInput;
\`\`\`

### 2. Content Security Policy (CSP)
A CSP header restricts the sources from which scripts can be loaded. This prevents inline scripts from executing even if an attacker injects them.

\`\`\`
Content-Security-Policy: default-src 'self'; script-src 'self'
\`\`\`

### 3. Input Validation
Validate and sanitize all user inputs on both client and server side. Use allowlists for expected formats (e.g., email, numbers) rather than blocklists.

### 4. Use a Sanitization Library
When you must render user-provided HTML, use libraries like **DOMPurify** to strip dangerous elements and attributes:

\`\`\`js
import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(dirtyHTML);
element.innerHTML = clean;
\`\`\`

## Key Takeaways
- Never trust user input, always validate and sanitize.
- Prefer \`textContent\` over \`innerHTML\`.
- Implement Content Security Policy headers.
- Use established sanitization libraries when rendering HTML.
- Regularly test your application with tools like Burp Suite or OWASP ZAP.
`,
  },
  {
    id: "network-traffic-analysis-wireshark",
    title: "A Student's Guide to Network Traffic Analysis with Wireshark",
    excerpt:
      "Learn how to capture, filter, and analyze network packets using Wireshark, the essential skill for any aspiring cybersecurity professional.",
    category: "Network Security",
    tags: ["Wireshark", "Packet Analysis", "Networking"],
    date: "2026-05-15",
    readTime: "8 min read",
    content: `
Wireshark is the world's most popular network protocol analyzer. Whether you're troubleshooting a network issue or investigating a security incident, understanding how to read packet captures is a fundamental skill in cybersecurity.

## Getting Started
Download Wireshark from **wireshark.org** and install it on your machine. On Linux, you can install it with:

\`\`\`bash
sudo apt update
sudo apt install wireshark
\`\`\`

When you launch Wireshark, you'll see a list of network interfaces. Select the one you want to monitor (e.g., \`eth0\` or \`wlan0\`) and click the shark fin icon to start capturing.

## Understanding the Interface
Wireshark's main window is divided into three panes:
- **Packet List**, A summary of each captured packet (time, source, destination, protocol, info).
- **Packet Details**, A tree-view breakdown of the selected packet's protocol layers.
- **Packet Bytes**, The raw hexadecimal and ASCII data of the selected packet.

## Essential Display Filters
Display filters let you narrow down the packets you see. Here are some commonly used ones:

\`\`\`
# Show only HTTP traffic
http

# Filter by IP address
ip.addr == 192.168.1.100

# Show only DNS queries
dns

# Filter by TCP port
tcp.port == 443

# Show only packets with a specific flag
tcp.flags.syn == 1 && tcp.flags.ack == 0
\`\`\`

## Practical Exercise: Analyzing an HTTP Session
1. Start a capture on your active interface.
2. Open a browser and visit an HTTP website (not HTTPS, so you can see the traffic in plain text).
3. Stop the capture.
4. Apply the filter \`http\`.
5. Right-click on a GET request and select **Follow → TCP Stream**.
6. You'll see the full HTTP request and response, including headers and body content.

## Saving and Sharing Captures
You can save your capture as a \`.pcap\` or \`.pcapng\` file for later analysis or to share with your team. Go to **File → Save As** and choose your format.

## Tips for Beginners
- Always capture on your own network or with explicit permission.
- Use capture filters to reduce file size when monitoring high-traffic networks.
- Learn the OSI model, it makes understanding packet layers much easier.
- Practice with sample captures from **wiki.wireshark.org/SampleCaptures**.
`,
  },
  {
    id: "building-cybersecurity-home-lab",
    title: "Building a Virtual Cyber Range: Home Lab Guide",
    excerpt:
      "Set up your own cybersecurity home lab with VirtualBox, Kali Linux, and vulnerable target machines for safe, legal hands-on practice.",
    category: "Home Lab",
    tags: ["VirtualBox", "Kali Linux", "Lab Setup", "Practice"],
    date: "2026-05-10",
    readTime: "7 min read",
    content: `
One of the best ways to learn cybersecurity is by building your own home lab. A virtual cyber range gives you a safe, isolated environment to practice offensive and defensive techniques without risking real systems or breaking any laws.

## What You'll Need
- **Hardware**, A computer with at least 8 GB RAM and 100 GB free disk space. 16 GB RAM is recommended.
- **Hypervisor**, VirtualBox (free) or VMware Workstation Player (free for personal use).
- **Attacker VM**, Kali Linux or Parrot Security OS.
- **Target VMs**, Intentionally vulnerable machines like Metasploitable 2, DVWA, or OWASP WebGoat.

## Step 1: Install VirtualBox
Download VirtualBox from **virtualbox.org** and install it. Also install the Extension Pack for USB support and other features.

## Step 2: Set Up Kali Linux
Download the pre-built Kali Linux VirtualBox image from **kali.org**. Import the \`.ova\` file into VirtualBox:

\`\`\`
File → Import Appliance → Select the .ova file → Import
\`\`\`

Default credentials are \`kali / kali\`. Change the password immediately after first login.

## Step 3: Set Up a Target Machine
Download Metasploitable 2-a deliberately vulnerable Linux VM. Extract the archive and create a new VM in VirtualBox pointing to the extracted \`.vmdk\` disk file.

## Step 4: Network Configuration
This is the most important step. You want your VMs to communicate with each other but **not** with the outside world:
1. In VirtualBox, go to **File → Host Network Manager** and create a new host-only network (e.g., \`vboxnet0\`).
2. Set both VMs' network adapters to **Host-only Adapter** using \`vboxnet0\`.
3. Boot both VMs and verify they can ping each other.

\`\`\`bash
# On Kali, find your IP
ip addr show

# Ping the target
ping 192.168.56.101
\`\`\`

## Step 5: Start Practicing
With your lab running, try these beginner exercises:
- **Nmap scanning**, Discover open ports and services on the target.
- **Metasploit**, Use the framework to exploit known vulnerabilities on Metasploitable.
- **Web app testing**, Set up DVWA on the target and practice SQL injection, XSS, and file upload attacks.
- **Wireshark**, Capture and analyze the traffic between your attacker and target.

## Safety Reminders
- Never connect vulnerable VMs to your real network or the internet.
- Always use host-only or internal networking for your lab.
- Take VM snapshots before making changes so you can revert easily.
- Only practice on systems you own or have explicit permission to test.
`,
  },
  {
    id: "freelance-sri-prayag-classes",
    title: "Case Study: Building a PWA Coaching Platform Without a Framework",
    excerpt:
      "The Sri Prayag Classes coaching PWA, installable app shell, offline-first service worker, deep course taxonomy, and a Cloudflare edge in front of a custom domain.",
    category: "Freelance",
    tags: ["PWA", "Service Worker", "Vanilla JS", "Cloudflare"],
    date: "2026-09-19",
    readTime: "8 min read",
    image: "/blog-images/freelance-sri-prayag-classes.webp",
    imageWidth: 1280,
    imageHeight: 900,
    content: `
In 2025 I took on the web presence for **Sri Prayag Classes** as a solo delivery, architecture, frontend, and the full deploy pipeline. The result, [sriprayagclasses.com](https://sriprayagclasses.com/), is a **progressive web app**: installable on a phone, openable offline, and deep-linkable straight into a specific course.

## Why No Framework
The target device is a mid-range Android on 3G, and the person maintaining the codebase after me is not a developer. A framework runtime, 60-90 KB of min+gzip just to bootstrap React or Vue, is a cost I did not want to push through the app shell. So the frontend is **vanilla JavaScript composed as ES modules**: small purpose-built modules (banner, main, modal) with no build step and no transpile. The module graph stays tiny, and the code remains legible to a different kind of maintainer.

## The PWA Layer
Two artifacts carry the weight:

- **Web app manifest**, \`display: standalone\`, \`theme_color\`, and the 192/512 icon set. This is what makes the app installable to the home screen with its own splash and standalone viewport.
- **Service worker**, the offline brain. Its fetch handler routes by resource type:

\`\`\`js
// navigate requests (real URLs): network-first, fall back to cache
// static assets: cache-first, backfill the cache on miss
// That split keeps the shell instant on revisit while letting
// course-catalog updates propagate.
\`\`\`

**Network-first for routes, cache-first for static assets**, the whole offline strategy in one line.

## Deep Course Taxonomy
The catalog is not one list. It is a set of deep routes: \`/courses/jee-advanced\`, \`/courses/neet-ug\`, and so on, each with its own head, metadata, and CTA. The routes are real URLs (not hash fragments), which is exactly what lets the service worker's navigation handler intercept and serve them offline.

## Conversion and Retention Surfaces
- **Student sign-in** at \`/signin\`, the portal gates study material behind a client-managed session.
- **WhatsApp deep links** (\`wa.me\`) on every course page, the conversion channel that actually works in this market: one tap exits to the messaging app with the enrollment message pre-filled.

## The Edge
The site sits behind **Cloudflare** on a custom domain: TLS termination at the edge, CDN-cached static assets, and PWA assets tagged as long-lived immutable URLs, so the service worker's cache is filled with byte-stable content.

## Performance Budget
The targets I set for the build:
- LCP under 2.5 s on a mid-range phone over throttled 3G.
- JS payload kept under ~30 KB total.
- WebP images, hero carrying \`fetchpriority="high"\`.
- Near-zero CLS, every image gets a fixed aspect-ratio box.

## What I Learned
Shipping a PWA without a framework forced me to think about *where* each byte runs. A service worker is not a cache, it is a routing and fallback policy. Get that right and the offline story mostly takes care of itself.
`,
  },
  {
    id: "freelance-webmaker",
    title: "Case Study: A No-Code Website Builder That Exports Production-Ready Code",
    excerpt:
      "The WebMaker build — a no-code website builder: template gallery with live previews, a section-variant editor, Firebase Auth behind server session cookies, server-side-only Firestore via the Admin SDK, and a React/Tailwind ZIP export you can self-host anywhere.",
    category: "Freelance",
    tags: ["Next.js 16", "Firebase", "Cloudinary", "Tailwind CSS 4"],
    date: "2026-11-03",
    readTime: "7 min read",
    image: "/blog-images/freelance-webmaker.webp",
    imageWidth: 1280,
    imageHeight: 800,
    content: `
I designed, built and shipped **WebMaker** ([webmaker.bond](https://www.webmaker.bond/)) solo — a no-code website builder for founders, freelancers and small teams. Pick a template, customize it live, and export **production-ready React/Next.js + Tailwind code** as a ZIP you deploy anywhere. You own the exported code — no vendor lock-in.

## The Product Flow
Five steps, end to end:

1. **Create Your Account** — free signup, no credit card required.
2. **Select a Website Template** — 10+ responsive designs across portfolios, clinics, weddings, photography, blogs and SaaS landing pages, each with a live preview.
3. **Customize & Style Content** — section variants (V1/V2/V3), a color wheel for brand colors, typography controls, and image/logo uploads.
4. **Configure Visibility & Cards** — toggle contact elements (phone, email) on/off and set link presets like LinkedIn, GitHub, Maps.
5. **Export ZIP & Go Live** — download a React/Next.js code ZIP archive and self-host on Vercel, Netlify, or any node web server.

## Architecture
The builder itself is **Next.js 16 (App Router) with React 19 and TypeScript**, styled with **Tailwind CSS 4**. The template system is data-driven: every template is a configuration object — sections, variants, style tokens, visibility flags — and the editor is a form-driven UI over that schema. Templates stay consistent because rendering is one engine reading one schema, not ten hand-built pages.

## Auth Without Client-Side Tokens
Authentication is **Firebase Auth (email/password + Google)**, but no Firebase token ever lives in the browser session. Instead, sign-in exchanges the Firebase credential for an **httpOnly server session cookie**. Every privileged route resolves the session from the cookie:

\`\`\`ts
// every privileged route resolves the session from the cookie,
// never from a client-side token
const session = await getSessionFromCookie();
if (!session) redirect("/login");
\`\`\`

This keeps the client bundle free of tokens, works with server components out of the box, and centralizes revocation and expiry on the server.

## Server-Side-Only Data Access
**Firestore is reached only through the Firebase Admin SDK**, inside route handlers and server code — the browser never talks to the database directly. Client-side Firestore rules are not part of the security model at all; the trust boundary is the server session, and all queries run with admin credentials on behalf of an authenticated, authorized user. One place to audit, one place to change.

## Media Pipeline
Uploaded images and logos go to **Cloudinary**, which handles storage, transformation and delivery. The editor references the hosted asset URLs, so exported templates stay static and load fast wherever they are deployed.

## The Export Pipeline
The export step serializes the template data back into real code: **optimized React components, Tailwind styling files, a sitemap, and configuration files** — a ZIP archive that runs on Vercel, Netlify, or any node web server. That last mile is the product's thesis: a builder that ends in code you own, not a closed platform you rent.

## Plans & Limits
- **Starter (free)** — 1 project, up to 3 ZIP downloads.
- **Professional** — unlimited projects and unlimited ZIP downloads.

## What I Learned
Building a builder is a different discipline from building a site. You ship three things at once — an editor, a template schema, and an export pipeline — and they all stand on one decision: treat every section, variant, style token and visibility toggle as **data**, not markup. Get the data model right and the editor is just forms over it, and the export step is just serialization.
`,
  },
  {
    id: "freelance-gupta-dental-care",
    title: "Case Study: A Local-SEO-Driven Clinic Website with a Real Booking Funnel",
    excerpt:
      "The Gupta Dental Care build, Bootstrap 5 grid, IntersectionObserver scroll reveals, a symptom-to-booking funnel, and schema.org local-business markup aimed at Kushinagar.",
    category: "Freelance",
    tags: ["Bootstrap 5", "Local SEO", "Core Web Vitals", "IntersectionObserver"],
    date: "2026-09-14",
    readTime: "6 min read",
    image: "/blog-images/freelance-gupta-dental-care.webp",
    imageWidth: 1280,
    imageHeight: 900,
    content: `
Building a web presence for a **dental clinic** is a different beast from building an app: the user is a patient, and the site's job is to convert concern into an appointment. For [guptadentalcare.cyou](https://guptadentalcare.cyou/), I designed the site as a **conversion funnel**, not a brochure.

## Funnel Architecture
- **Home**, outcome-led hero, services grid, social proof (testimonials), and a persistent "Book Appointment" CTA.
- **Symptom pages** (\`symptoms.html\`), content pages that target the searches patients actually type. One canonical URL per condition, each with a CTA back into booking.
- **Booking** (\`booking.html\`), a single-purpose conversion page: name, phone, preferred time. Minimal fields, no login, no multi-step wizard.

The principle: every page has a *job to do*, and the navigation hierarchy encodes that.

## Bootstrap 5, Used Deliberately
The layout rides **Bootstrap 5's 12-column grid** with its standard breakpoints (sm 576, md 768, lg 992, xl 1200). Why a framework kit instead of a bespoke design system? Because the client's maintenance needs come first: any web developer can pick up a Bootstrap layout, and the 5.x JS bundle is dependency-free. I used the grid and the components, then overrode the theme tokens with the clinic's brand palette.

## Scroll Reveals Without the JS Weight
Page animations use **IntersectionObserver**-driven reveals (AOS-style): elements register with a threshold and a rootMargin, and receive an opacity/translate transition on intersection. Two details matter:

\`\`\`js
const io = new IntersectionObserver(
  (entries) =>
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("revealed");
        io.unobserve(e.target); // fire once, then done
      }
    }),
  { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
);
\`\`\`

- **Once-semantics**, unobserving after reveal means no re-trigger on scroll-back and no work spent on off-screen elements.
- The **-10% bottom rootMargin** reveals elements slightly *before* they hit the viewport, so nothing pops in at the last moment.

## The Local-SEO Layer
This is where a clinic site actually wins or loses:

- **On-page**, geo-qualified keywords in title/meta; the H1 carries service + city.
- **Structured data**, \`schema.org\` **LocalBusiness / Dentist** JSON-LD: address, geo coordinates, opening hours, phone. That markup is what earns rich results (hours, phone) in the local pack.
- **NAP consistency**, Name, Address, Phone in one canonical shape across the footer, the schema, and the booking page.

## Core Web Vitals
- **LCP**, hero is a WebP with \`fetchpriority="high"\` (or a text LCP with zero blocking requests).
- **CLS**, every image box has a fixed aspect-ratio, so the page never reflows mid-load.
- **TBT**, all interactivity is under 2 KB of inline JS: no framework, no third-party runtime.

## What I Learned
A clinic site is an SEO and funnel exercise wearing a design skin. The schema layer and the booking funnel do more for the client than any animation.
`,
  },
  {
    id: "freelance-kashyap-tutorial",
    title: "Case Study: Multi-Route Static Architecture on the Vercel Edge",
    excerpt:
      "How the Kashyap Tutorial portal is structured: static multi-page routing, a data model for results and faculty, a demo-booking flow, and a dual-domain vercel.app + custom CNAME setup.",
    category: "Freelance",
    tags: ["Vercel", "Static Site", "Core Web Vitals", "DNS"],
    date: "2026-09-09",
    readTime: "7 min read",
    image: "/blog-images/freelance-kashyap-tutorial.webp",
    imageWidth: 1280,
    imageHeight: 900,
    content: `
The [Kashyap Tutorial](https://kashyap-tutorial.vercel.app/) portal (mirrored on a custom domain) is a **static multi-page application** on the Vercel edge. The "static" part is the architectural decision worth writing about.

## Why Static, and Why Multi-Page
The data, course catalog, past results, faculty profiles, changes on a human timescale: days, not minutes. So I ship **pre-rendered pages**, not client-side-rendered routes:

- **TTFB near zero**, pages are edge-cached; a request hits a CDN PoP near the user, not a server that has to generate a route.
- **No hydration cost**, zero client-side route resolution, zero bundle download before paint.
- **Atomic deploys**, one build, pushed to every edge PoP at once. Rollback means repointing at the previous build.
- **Multi-page, not SPA**, each route is a real HTML document. A link from WhatsApp or Google lands on a fully-formed page, not a blank shell that flashes in its content.

## Route Map and Data Model
The portal is a handful of real routes: the catalog, course detail pages, \`/results\`, and \`/demo-booking\`.

The **results dataset** is the modeling piece: a table keyed by *(exam, year, name, score)*. Flat at export, indexed at build time so the results page can look up without shipping the full table to the client.

**Faculty and results are social proof by design**, the highest-trust content in the domain is what goes at the top of the funnel.

## The Demo-Booking Funnel
A single-purpose form page: client-side validation on blur, field-level error states, phone normalization before submit, and an explicit success affordance. No login, no multi-step wizard, one screen, one action.

## Dual-Domain Strategy
The same build is served on **both** the \`vercel.app\` URL **and** a custom domain:

- DNS points the custom domain at the Vercel edge via CNAME.
- The \`vercel.app\` URL stays live as a failover and a shareable link.
- One deploy updates both domains, the custom domain is a pointer, not a copy of the build.

## Core Web Vitals
- **LCP**, the first hero media is a WebP inside a fixed aspect-ratio box.
- **CLS**, near zero by construction: static HTML, no client-side reflow after layout.
- **TBT**, negligible JS budget, so total blocking time is effectively zero on any connection.

## What I Learned
Static is a design constraint that forces you to make the data-modeling decisions up front. The payoff is the simplest possible runtime: no server, no state, no deploy drama, and Core Web Vitals you do not have to fight for.
`,
  },
  {
    id: "freelance-infinity-classes",
    title: "Case Study: Institute Site with Mock-Test Performance Analytics",
    excerpt:
      "The Infinity Classes build, a static multi-page institute site where a mock-test flow turns attempt data into topic-level weak-area diagnostics, served from the Vercel edge.",
    category: "Freelance",
    tags: ["Vercel", "Static Site", "Data Analytics", "Accessibility"],
    date: "2026-09-05",
    readTime: "7 min read",
    image: "/blog-images/freelance-infinity-classes.webp",
    imageWidth: 1280,
    imageHeight: 900,
    content: `
The [Infinity Classes](https://infinity-classes-one.vercel.app/) site is a static, multi-page institute web app whose headline feature is **mock-test performance analytics**: sit a test, get topic-level diagnostics. Here is how that data flows, and why the whole thing stays on the Vercel edge.

## Page Architecture
A handful of real routes: the catalog, course detail pages, \`/study-material\`, \`/results\`, and \`/blog\`. Static multi-page for the same TTFB/hydration reasons as any SSG: the content changes slowly, so pre-render it and edge-cache it.

## The Mock-Test Analytics Flow
The interesting part is the diagnostic pipeline:

1. **Input**, an attempt record: answers, time-per-question, topic tags per question, and the max score.
2. **Client-side computation**, there is no backend analytics service. The browser does the math on the attempt JSON:
   - accuracy per topic (\`correct / attempted\`)
   - time-per-question against a par time
   - **weak-area detection**, topics below a pass-accuracy threshold, ranked by their weight in the exam
3. **Output**, per-topic performance, a prioritized weak-area list, and a suggested study order.

Because the computation is local, the feature works offline once the page is cached, and attempt data never leaves the student's device, a privacy property that came for free. The institute markets this as **AI-powered performance analysis**; what ships is the deterministic analytics above, which does the diagnostic job without a model call.

## Study-Material Distribution
Notes and past papers are **static files** served from the edge: byte-stable, cache-immutable, zero origin load. The page that lists them is just an index.

## Performance and Accessibility Budget
- **CWV**, WebP hero, fixed aspect-ratio boxes (CLS near zero), minimal inline JS (TBT near zero), LCP under 2.5 s on a throttled mid-range phone.
- **A11y**, results rendered as semantic tables with proper \`scope\`, focus managed in the diagnostic panel, and all motion gated behind \`prefers-reduced-motion\`.

## What I Learned
Static architecture forces the data-modeling decisions, attempt schemas, topic tags, to the front, and pays back in the simplest runtime possible. And a small local computation beats a remote model call on both latency and privacy.
`,
  },
];

export const BLOG_CATEGORIES = Array.from(
  new Set(BLOG_POSTS.map((p) => p.category)),
);

/* ── Portfolio content ── */
export const PORTFOLIO = {
  name: "Ashish Gupta",
  role: "Cyber Security Student",
  tagline:
    "Cyber Security student at NIET, building skills in network defense, ethical hacking, and digital forensics.",
  stats: [
    { label: "Projects", value: "11" },
    { label: "Internships", value: "2" },
    { label: "Certifications", value: "2" },
  ],
  socials: {
    email: "agupta38160@gmail.com",
    linkedin: "https://www.linkedin.com/in/ashish-gupta-037973259/",
    github: "https://github.com/bitcodeAShishcloud",
    resume:
      "https://docs.google.com/document/d/e/2PACX-1vRSxngFM1nfzOhgb7wWJaqsN7FS6lgv8Fdh0UUuuYAfLS4siboHQsTRL-bdKhMAl7VlqvKa9_uXfxyY/pub",
  },
  about:
    "I'm a dedicated 3rd-year Cyber Security student at NIET, Greater Noida, with a deep passion for protecting digital assets and understanding the intricacies of cyber threats. I specialize in network defense, ethical hacking, and digital forensics, and I combine Python and C++ with security expertise to build comprehensive solutions.",
  education: {
    degree: "Bachelor's in Cyber Security",
    institution: "NIET, Greater Noida",
    year: "2024 - 2028 (3rd Year)",
    description:
      "Currently pursuing a comprehensive degree in Cyber Security with focus on network security, ethical hacking, digital forensics, and cyber threat analysis. Actively participating in security workshops and practical labs.",
    subjects: ["Network Security", "Cryptography", "Digital Forensics", "Ethical Hacking", "Cyber Law"],
  },
  experience: [
    {
      title: "Freelance Web Developer",
      org: "Self-employed",
      year: "2025-Present",
      desc: "Solo delivery of four production web properties for coaching institutes and a dental clinic: architecture and responsive frontends, forms and booking funnels, a PWA offline strategy, local-SEO schema, and the full deploy pipeline (Vercel edge + Cloudflare, custom DNS and TLS).",
      tech: ["Responsive Frontend", "PWA", "Vercel", "Cloudflare", "Local SEO"],
    },
    {
      title: "Cyber Security Intern",
      org: "Prodigy InfoTech",
      year: "2025",
      desc: "Completed cybersecurity tasks including security analysis, vulnerability assessment, and threat detection projects. Gained hands-on experience with security tools and methodologies.",
      tech: ["Python", "Security Analysis", "Vulnerability Assessment"],
    },
    {
      title: "Python Developer Intern",
      org: "CodSoft",
      year: "2025",
      desc: "Developed various Python applications demonstrating programming proficiency and problem-solving skills. Created desktop applications and worked on automation projects.",
      tech: ["Python", "Desktop Applications", "Automation"],
    },
  ],
  skills: [
    {
      category: "Cyber Security",
      items: [
        { name: "Network Security", desc: "Network monitoring, firewall configuration, and intrusion detection", skillLevel: "Core" },
        { name: "Penetration Testing", desc: "Vulnerability assessment and ethical hacking methodologies", skillLevel: "Proficient" },
        { name: "Ethical Hacking", desc: "Security testing and vulnerability identification", skillLevel: "Core" },
        { name: "Digital Forensics", desc: "Evidence collection and analysis for cyber investigations", skillLevel: "Proficient" },
        { name: "Threat Analysis", desc: "Cyber threat intelligence and risk assessment", skillLevel: "Proficient" },
      ],
    },
    {
      category: "Programming & Tools",
      items: [
        { name: "Python", desc: "Security automation, scripting, and application development", skillLevel: "Core" },
        { name: "C++", desc: "System programming and performance-critical applications", skillLevel: "Proficient" },
        { name: "Wireshark", desc: "Network protocol analysis and traffic monitoring", skillLevel: "Proficient" },
        { name: "Kali Linux", desc: "Penetration testing and security auditing platform", skillLevel: "Proficient" },
        { name: "Metasploit", desc: "Exploitation framework and vulnerability testing", skillLevel: "Learning" },
      ],
    },
  ],
  projects: [
    {
      name: "Fine-Tuning real model (Google Gemma 2B)",
      desc: "Fine-tuned Google Gemma 2B into a personal assistant with QLoRA (4-bit NF4, LoRA r=8 on attention projections), served through a FastAPI backend with a vanilla-JS chat UI and a like-based feedback loop.",
      tech: ["Gemma 2B", "QLoRA", "PEFT", "TRL", "PyTorch", "FastAPI"],
      github: "https://github.com/bitcodeAShishcloud/Poppit-Ai",
      caseStudy: "poppit-ai-gemma-2b-qlora",
      category: "GitHub",
    },
    {
      name: "Security Showcase",
      category: "GitHub",
      desc: "A security-first frontend demo showing DOM-based XSS prevention techniques, safe DOM rendering, sanitization layers, and CSP enforcement.",
      tech: ["XSS Prevention", "JavaScript", "Frontend Security"],
      github: "https://github.com/bitcodeAShishcloud/security-showcase",
      live: "https://bitcodeashishcloud.github.io/security-showcase/",
    },
    {
      name: "Live Compiler Pro",
      category: "GitHub",
      desc: "Powerful live code editor with real-time collaboration, chat, and WebRTC-based code sharing-perfect for pair programming and demos.",
      tech: ["JavaScript", "Node.js", "Socket.io"],
      github: "https://github.com/bitcodeAShishcloud/live-code",
      live: "https://live-code-hxft.onrender.com/",
    },
    {
      name: "News Aggregator",
      category: "GitHub",
      desc: "A full-stack news aggregator that pulls latest technology articles via NewsAPI, stores them to MySQL and presents a clean feed with user accounts.",
      tech: ["PHP", "MySQL", "JavaScript"],
      github: "https://github.com/bitcodeAShishcloud/News-Aggregator",
      live: "https://news-aggregator.rf.gd",
    },
    {
      name: "Files Shorter",
      category: "GitHub",
      desc: "Client-side secure file uploader that organizes uploads into Google Drive folders by subject-easy to use, no server required.",
      tech: ["Google Drive", "JavaScript", "HTML"],
      github: "https://github.com/bitcodeAShishcloud/Files-Shorter",
      live: "https://bitcodeashishcloud.github.io/Files-Shorter/",
    },
    {
      name: "Banking Shopping System",
      category: "GitHub",
      desc: "A comprehensive banking and shopping desktop application built with Python, featuring secure transaction processing, user authentication, and inventory management.",
      tech: ["Python", "Desktop App", "Security"],
      github: "https://github.com/bitcodeAShishcloud/banking-shopping-system/",
    },
    {
      name: "Sri Prayag Classes",
      category: "Freelancing",
      desc: "Coaching-institute PWA: installable app shell, offline-first service worker, deep course taxonomy (JEE/NEET), student sign-in portal, and WhatsApp enrollment CTAs, designed and shipped solo.",
      tech: ["PWA", "Service Worker", "Vanilla JS", "Cloudflare"],
      live: "https://sriprayagclasses.com/",
      caseStudy: "freelance-sri-prayag-classes",
      image: "/blog-images/freelance-sri-prayag-classes-thumb.webp",
      thumbW: 720,
      thumbH: 506,
      freelance: true,
    },
    {
      name: "WebMaker",
      category: "Freelancing",
      desc: "No-code website builder: 10+ responsive templates with live previews, section variants and brand style controls, exporting production-ready React/Next.js + Tailwind code as a ZIP — deploy anywhere, no vendor lock-in.",
      tech: ["Next.js 16", "Firebase", "Cloudinary", "Tailwind CSS 4"],
      live: "https://www.webmaker.bond/",
      caseStudy: "freelance-webmaker",
      image: "/blog-images/webmaker-thumb.webp",
      thumbW: 1280,
      thumbH: 800,
      freelance: true,
    },
    {
      name: "Gupta Dental Care",
      category: "Freelancing",
      desc: "Clinic website as a conversion funnel: Bootstrap 5 layout, symptom-to-booking flow, IntersectionObserver scroll reveals, and schema.org local-business markup for Kushinagar.",
      tech: ["Bootstrap 5", "Local SEO", "Core Web Vitals", "WebP"],
      live: "https://guptadentalcare.cyou/",
      caseStudy: "freelance-gupta-dental-care",
      image: "/blog-images/freelance-gupta-dental-care-thumb.webp",
      thumbW: 720,
      thumbH: 506,
      freelance: true,
    },
    {
      name: "Kashyap Tutorial",
      category: "Freelancing",
      desc: "Course and results portal on the Vercel edge: static multi-page routes, exam-year-keyed results data model, demo-booking funnel, dual-domain vercel.app + custom CNAME setup.",
      tech: ["Vercel Edge", "Static Multi-page", "DNS/CNAME", "Core Web Vitals"],
      live: "https://kashyap-tutorial.vercel.app/",
      caseStudy: "freelance-kashyap-tutorial",
      image: "/blog-images/freelance-kashyap-tutorial-thumb.webp",
      thumbW: 720,
      thumbH: 506,
      freelance: true,
    },
    {
      name: "Infinity Classes",
      category: "Freelancing",
      desc: "Institute site with mock-test performance analytics: static multi-page app, client-side weak-area diagnostics from attempt data, static study-material distribution, served from the Vercel edge.",
      tech: ["Vercel Edge", "Static Site", "Analytics UI", "Accessibility"],
      live: "https://infinity-classes-one.vercel.app/",
      caseStudy: "freelance-infinity-classes",
      image: "/blog-images/freelance-infinity-classes-thumb.webp",
      thumbW: 720,
      thumbH: 506,
      freelance: true,
    },
  ],
  certifications: [
    {
      issuer: "Red Hat",
      title: "Red Hat Training (System Admin)",
      date: "2025",
      status: "Completed Training",
      link: "https://www.linkedin.com/in/ashish-gupta-037973259/details/certifications/",
      image: "/assets/red_hat_training.webp",
      imageWidth: 1024,
      imageHeight: 1024,
    },
    {
      issuer: "TryHackMe",
      title: "Advent of Cyber 2025",
      date: "26th December 2025",
      status: "Credential ID: THM-9K6QLVOJPQ",
      link: "https://tryhackme-certificates.s3-eu-west-1.amazonaws.com/THM-9K6QLVOJPQ.pdf",
      image: "/assets/advent_of_cyber_2025.webp",
      imageWidth: 1531,
      imageHeight: 930,
    },
  ],
};
