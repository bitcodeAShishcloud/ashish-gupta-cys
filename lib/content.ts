export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  date: string;
  readTime: string;
  image?: string;
  content: string; // markdown
}

export const BLOG_POSTS: BlogPost[] = [
  {
    id: "building-news-aggregator",
    title: "How I Built a Full-Stack News Aggregator with PHP and MySQL",
    excerpt:
      "A walkthrough of my News Aggregator project — pulling articles from NewsAPI, storing them in MySQL, and serving a clean feed with user accounts.",
    category: "Projects",
    tags: ["PHP", "MySQL", "JavaScript", "API"],
    date: "2026-05-08",
    readTime: "6 min read",
    image: "blog-images/news-aggregator.webp",
    content: `
One of the projects I'm most proud of is my **News Aggregator** — a full-stack web application that fetches the latest technology news from NewsAPI, stores articles in a MySQL database, and presents them in a clean, browsable feed with user authentication.

## Why I Built It
I wanted a single place to read tech news without jumping between dozens of websites. I also wanted to practice building a proper full-stack application with a real database, user accounts, and API integration.

## Tech Stack
- **Backend** — PHP for server-side logic and API communication.
- **Database** — MySQL for storing fetched articles, user accounts, and preferences.
- **Frontend** — HTML, CSS, and JavaScript for a responsive user interface.
- **API** — NewsAPI for pulling the latest articles in real time.

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
- **Rate limits** — NewsAPI's free tier has a request cap. I implemented caching so articles are only fetched every 15 minutes.
- **Duplicate prevention** — Used \`INSERT IGNORE\` and unique constraints on article URLs to avoid storing the same article twice.
- **Responsive design** — Making the card layout look good on both desktop and mobile took several iterations.

## What I Learned
This project taught me how to work with third-party APIs, design database schemas, handle user authentication securely, and build a responsive frontend. It was my first real full-stack project and gave me confidence to tackle bigger challenges.
`,
  },
  {
    id: "live-compiler-pro-real-time-collaboration",
    title: "Live Compiler Pro: Building a Real-Time Code Editor with WebRTC",
    excerpt:
      "Behind the scenes of Live Compiler Pro — real-time collab rooms, live chat with photo sharing, and WebRTC-based code editing in the browser.",
    category: "Projects",
    tags: ["JavaScript", "Node.js", "Socket.io", "WebRTC"],
    date: "2026-05-05",
    readTime: "10 min read",
    image: "blog-images/live-compiler-pro.webp",
    content: `
**Live Compiler Pro** is a browser-based IDE at [live-code-hxft.onrender.com](https://live-code-hxft.onrender.com/) that supports multi-language editing, live preview, a built-in console, and real-time collaboration — ideal for pair programming, demos, and teaching.

## The Idea
During college, I often wanted to code with friends remotely. Existing tools were either too heavy or required installations. I wanted something lightweight that works right in the browser — open the app, share a room code, and start coding together.

## Core Features
- **Multi-language editor** — HTML, CSS, JavaScript, Python, JSON, and Markdown with syntax highlighting.
- **Live preview** — Run code manually or switch to Auto Run for instant HTML/CSS/JS updates.
- **Built-in console** — View logs, warnings, and errors; run JavaScript from the console input.
- **Files & export** — Create files, import from disk, rename tabs, and export as ZIP or individual files.
- **Theme toggle** — Dark and light modes for comfortable long sessions.
- **Code snippets** — Quick templates to bootstrap common patterns.

## Live Collaboration (Collab)
The **Collab** button in the header opens the **Live Collaboration** panel — the heart of real-time pair programming in Live Compiler Pro. You can code together with classmates or teammates without installing anything extra.

### Two ways to collaborate
- **Anywhere (P2P)** — Connect with others over the internet using peer-to-peer networking. Best when you and your partner are on different networks or cities. The host sees a status badge (*Connected* / *Host*) and a shareable room code.
- **Same Browser** — Mirror code across tabs in the same browser with **Tab Sync**. Handy for testing responsive layouts or comparing two versions side by side without a network room.

### How a live room works
1. Click **Collab** in the toolbar, then choose a username (shown to others in the room).
2. **Create & Join Room** — you become the host and receive a **12-character room code** (for example \`HGAH1QTS29ST\`).
3. Share the code via **Copy invite & share** — teammates paste it under **Join a room** and click **Join**.
4. Everyone edits the same workspace in real time while the **Chat** sidebar stays open for live discussion.
5. Hosts can **Reconnect** if the session drops or **Leave Room** to end their participation.

### Live Chat inside Collab rooms
Collaboration is not just shared code — you also get a built-in **Chat** panel on the left so you never have to switch to WhatsApp or Discord mid-debug. On [Live Compiler Pro](https://live-code-hxft.onrender.com/), chat is tied directly to the active room: text and images stay in the same thread as your live coding session.

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
- **Conflict resolution** — When two users edit the same line simultaneously, changes can clash. I implemented a simple last-write-wins strategy which works well for small teams.
- **Cursor management** — Applying remote changes without jumping the local cursor was tricky. I track cursor offsets before and after applying updates.
- **Room management** — Each collaboration session gets a unique room ID. Users join by appending it to the URL.

## What I Learned
This project deepened my understanding of WebSockets, real-time event architectures, and the challenges of collaborative editing. It also taught me how to structure a Node.js application for scalability.
`,
  },
  {
    id: "files-shorter-google-drive-uploader",
    title: "Files Shorter: A Client-Side File Organizer for Google Drive",
    excerpt:
      "How I built a zero-server file uploader that organizes uploads into Google Drive folders by subject — using just HTML and JavaScript.",
    category: "Projects",
    tags: ["Google Drive API", "JavaScript", "HTML", "Serverless"],
    date: "2026-05-01",
    readTime: "5 min read",
    image: "blog-images/files-shorter.webp",
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
- **No backend** — Everything runs in the browser. The Google API client handles authentication via OAuth2.
- **Predefined folders** — Subject folders are created in advance on Drive. The app maps subject names to folder IDs.
- **Simple UI** — A clean, minimal interface that anyone can use without instructions.

## What I Learned
Working with the Google Drive API taught me about OAuth2 flows, multipart file uploads, and the importance of keeping things simple. The entire app is under 200 lines of JavaScript.
`,
  },
  {
    id: "security-showcase-xss-prevention-demo",
    title: "Security Showcase: Demonstrating XSS Prevention in the Browser",
    excerpt:
      "A deep dive into my Security Showcase project — a hands-on demo of DOM-based XSS attacks and the defense techniques that stop them.",
    category: "Projects",
    tags: ["XSS Prevention", "JavaScript", "Frontend Security", "CSP"],
    date: "2026-04-25",
    readTime: "6 min read",
    image: "blog-images/security-showcase.webp",
    content: `
My **Security Showcase** project is a frontend-only demonstration of common DOM-based Cross-Site Scripting (XSS) attacks and the layered defenses that prevent them. It's designed as an educational tool for students learning web security.

## What It Demonstrates
The app has two modes:
- **Vulnerable Mode** — Shows how unsafe DOM manipulation (like using \`innerHTML\` with user input) creates XSS vulnerabilities.
- **Protected Mode** — Demonstrates the same functionality with proper defenses in place, showing that security doesn't have to break usability.

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
The **Banking Shopping System** is a desktop application I built in Python that combines banking operations with a shopping experience. Users can create accounts, deposit and withdraw funds, browse products, and make purchases — all with security features baked in from the start.

## Core Features
- **User Authentication** — Account creation with hashed passwords and secure login.
- **Banking Operations** — Deposit, withdraw, check balance, and view transaction history.
- **Shopping System** — Browse an inventory catalog, add items to cart, and checkout using account balance.
- **Transaction Logging** — Every financial operation is logged with timestamps for audit trails.

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
- **auth.py** — Handles user registration, login, and password management.
- **banking.py** — Manages accounts, deposits, withdrawals, and balance inquiries.
- **shop.py** — Handles the product catalog, cart, and checkout flow.
- **main.py** — The entry point with a menu-driven interface.

## Challenges
- **Data persistence** — Without a database, I used JSON files to store account data. This required careful file handling to prevent corruption during concurrent writes.
- **Menu flow** — Designing an intuitive CLI menu that guides users through banking and shopping without confusion took multiple iterations.
- **Edge cases** — Handling scenarios like insufficient funds during checkout, empty cart submissions, and invalid product IDs required thorough testing.

## What I Learned
This was my first significant Python project. It taught me about modular code design, secure data handling, and the importance of thinking about edge cases and error handling from the beginning — not as an afterthought.
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
- **Stored XSS** — The malicious script is permanently stored on the target server (e.g., in a database).
- **Reflected XSS** — The script is reflected off a web server in error messages, search results, or any response that includes input from a user.
- **DOM-based XSS** — The vulnerability exists entirely in client-side code. The attack payload is executed by modifying the DOM in the victim's browser.

## A Simple Example
Consider a search page that displays the user's query:

\`\`\`js
// Vulnerable code — DO NOT USE
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
- Never trust user input — always validate and sanitize.
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
      "Learn how to capture, filter, and analyze network packets using Wireshark — the essential skill for any aspiring cybersecurity professional.",
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
- **Packet List** — A summary of each captured packet (time, source, destination, protocol, info).
- **Packet Details** — A tree-view breakdown of the selected packet's protocol layers.
- **Packet Bytes** — The raw hexadecimal and ASCII data of the selected packet.

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
- Learn the OSI model — it makes understanding packet layers much easier.
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
- **Hardware** — A computer with at least 8 GB RAM and 100 GB free disk space. 16 GB RAM is recommended.
- **Hypervisor** — VirtualBox (free) or VMware Workstation Player (free for personal use).
- **Attacker VM** — Kali Linux or Parrot Security OS.
- **Target VMs** — Intentionally vulnerable machines like Metasploitable 2, DVWA, or OWASP WebGoat.

## Step 1: Install VirtualBox
Download VirtualBox from **virtualbox.org** and install it. Also install the Extension Pack for USB support and other features.

## Step 2: Set Up Kali Linux
Download the pre-built Kali Linux VirtualBox image from **kali.org**. Import the \`.ova\` file into VirtualBox:

\`\`\`
File → Import Appliance → Select the .ova file → Import
\`\`\`

Default credentials are \`kali / kali\`. Change the password immediately after first login.

## Step 3: Set Up a Target Machine
Download Metasploitable 2 — a deliberately vulnerable Linux VM. Extract the archive and create a new VM in VirtualBox pointing to the extracted \`.vmdk\` disk file.

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
- **Nmap scanning** — Discover open ports and services on the target.
- **Metasploit** — Use the framework to exploit known vulnerabilities on Metasploitable.
- **Web app testing** — Set up DVWA on the target and practice SQL injection, XSS, and file upload attacks.
- **Wireshark** — Capture and analyze the traffic between your attacker and target.

## Safety Reminders
- Never connect vulnerable VMs to your real network or the internet.
- Always use host-only or internal networking for your lab.
- Take VM snapshots before making changes so you can revert easily.
- Only practice on systems you own or have explicit permission to test.
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
    "Cyber Security student at NIET — building skills in network defense, ethical hacking, and digital forensics.",
  stats: [
    { label: "Projects", value: "6+" },
    { label: "Internships", value: "2" },
    { label: "Certifications", value: "2" },
  ],
  socials: {
    email: "agupta38160@gmail.com",
    linkedin: "https://www.linkedin.com/in/ashish-gupta-037973259/",
    github: "https://github.com/bitcodeAShishcloud",
    resume:
      "https://docs.google.com/document/d/1CyutTZwx5yiNymublFrvZl83Phl_J_4V5uztn3OJZJ0/edit?usp=sharing",
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
        { name: "Network Security", desc: "Network monitoring, firewall configuration, and intrusion detection", level: 85 },
        { name: "Penetration Testing", desc: "Vulnerability assessment and ethical hacking methodologies", level: 75 },
        { name: "Ethical Hacking", desc: "Security testing and vulnerability identification", level: 80 },
        { name: "Digital Forensics", desc: "Evidence collection and analysis for cyber investigations" },
        { name: "Threat Analysis", desc: "Cyber threat intelligence and risk assessment" },
      ],
    },
    {
      category: "Programming & Tools",
      items: [
        { name: "Python", desc: "Security automation, scripting, and application development", level: 90 },
        { name: "C++", desc: "System programming and performance-critical applications" },
        { name: "Wireshark", desc: "Network protocol analysis and traffic monitoring" },
        { name: "Kali Linux", desc: "Penetration testing and security auditing platform" },
        { name: "Metasploit", desc: "Exploitation framework and vulnerability testing" },
      ],
    },
  ],
  projects: [
    {
      name: "News Aggregator",
      desc: "A full-stack news aggregator that pulls latest technology articles via NewsAPI, stores them to MySQL and presents a clean feed with user accounts.",
      tech: ["PHP", "MySQL", "JavaScript"],
      github: "https://github.com/bitcodeAShishcloud/News-Aggregator",
      live: "https://news-aggregator.rf.gd",
    },
    {
      name: "Live Compiler Pro",
      desc: "Powerful live code editor with real-time collaboration, chat, and WebRTC-based code sharing—perfect for pair programming and demos.",
      tech: ["JavaScript", "Node.js", "Socket.io"],
      github: "https://github.com/bitcodeAShishcloud/live-code",
      live: "https://live-code-hxft.onrender.com/",
    },
    {
      name: "Files Shorter",
      desc: "Client-side secure file uploader that organizes uploads into Google Drive folders by subject—easy to use, no server required.",
      tech: ["Google Drive", "JavaScript", "HTML"],
      github: "https://github.com/bitcodeAShishcloud/Files-Shorter",
      live: "https://bitcodeashishcloud.github.io/Files-Shorter/",
    },
    {
      name: "Security Showcase",
      desc: "A security-first frontend demo showing DOM-based XSS prevention techniques, safe DOM rendering, sanitization layers, and CSP enforcement.",
      tech: ["XSS Prevention", "JavaScript", "Frontend Security"],
      github: "https://github.com/bitcodeAShishcloud/security-showcase",
      live: "https://bitcodeashishcloud.github.io/security-showcase/",
    },
    {
      name: "Banking Shopping System",
      desc: "A comprehensive banking and shopping desktop application built with Python, featuring secure transaction processing, user authentication, and inventory management.",
      tech: ["Python", "Desktop App", "Security"],
      github: "https://github.com/bitcodeAShishcloud/banking-shopping-system/",
    },
  ],
  certifications: [
    {
      issuer: "Red Hat",
      title: "Red Hat Training (System Admin)",
      date: "2025",
      status: "Completed Training",
      link: "https://www.linkedin.com/in/ashish-gupta-037973259/details/certifications/",
      image: "assets/red_hat_training.webp",
    },
    {
      issuer: "TryHackMe",
      title: "Advent of Cyber 2025",
      date: "26th December 2025",
      status: "Credential ID: THM-9K6QLVOJPQ",
      link: "https://tryhackme-certificates.s3-eu-west-1.amazonaws.com/THM-9K6QLVOJPQ.pdf",
      image: "assets/advent_of_cyber_2025.webp",
    },
  ],
};
