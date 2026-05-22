// Blog Posts Data
// To add a new post, simply add a new object to this array.

const BLOG_POSTS = [
    {
        id: "building-news-aggregator",
        title: "How I Built a Full-Stack News Aggregator with PHP and MySQL",
        excerpt: "A walkthrough of my News Aggregator project — pulling articles from NewsAPI, storing them in MySQL, and serving a clean feed with user accounts.",
        category: "Projects",
        tags: ["PHP", "MySQL", "JavaScript", "API"],
        date: "2026-05-08",
        readTime: "6 min read",
        author: "Ashish Gupta",
        image: "blog-images/news-aggregator.png",
        content: `
            <p>One of the projects I'm most proud of is my <strong>News Aggregator</strong> — a full-stack web application that fetches the latest technology news from NewsAPI, stores articles in a MySQL database, and presents them in a clean, browsable feed with user authentication.</p>

            <h2>Why I Built It</h2>
            <p>I wanted a single place to read tech news without jumping between dozens of websites. I also wanted to practice building a proper full-stack application with a real database, user accounts, and API integration.</p>

            <h2>Tech Stack</h2>
            <ul>
                <li><strong>Backend</strong> — PHP for server-side logic and API communication.</li>
                <li><strong>Database</strong> — MySQL for storing fetched articles, user accounts, and preferences.</li>
                <li><strong>Frontend</strong> — HTML, CSS, and JavaScript for a responsive user interface.</li>
                <li><strong>API</strong> — NewsAPI for pulling the latest articles in real time.</li>
            </ul>

            <h2>How It Works</h2>
            <h3>1. Fetching Articles</h3>
            <p>A PHP script makes requests to the NewsAPI endpoint for technology articles. The response is parsed and each article's title, description, source, URL, and thumbnail are stored in the MySQL database:</p>
            <pre><code>$url = "https://newsapi.org/v2/top-headlines?category=technology&apiKey=" . $apiKey;
$response = file_get_contents($url);
$data = json_decode($response, true);

foreach ($data['articles'] as $article) {
    // Insert into database, skip duplicates
    $stmt = $pdo->prepare("INSERT IGNORE INTO articles ...");
    $stmt->execute([...]);
}</code></pre>

            <h3>2. User Authentication</h3>
            <p>Users can register and log in. Passwords are hashed with <code>password_hash()</code> and verified with <code>password_verify()</code>. Sessions keep users logged in across pages.</p>

            <h3>3. The Feed</h3>
            <p>The homepage pulls articles from the database sorted by date and renders them as cards. JavaScript handles lazy loading and smooth interactions without full page reloads.</p>

            <h2>Challenges Faced</h2>
            <ul>
                <li><strong>Rate limits</strong> — NewsAPI's free tier has a request cap. I implemented caching so articles are only fetched every 15 minutes.</li>
                <li><strong>Duplicate prevention</strong> — Used <code>INSERT IGNORE</code> and unique constraints on article URLs to avoid storing the same article twice.</li>
                <li><strong>Responsive design</strong> — Making the card layout look good on both desktop and mobile took several iterations.</li>
            </ul>

            <h2>What I Learned</h2>
            <p>This project taught me how to work with third-party APIs, design database schemas, handle user authentication securely, and build a responsive frontend. It was my first real full-stack project and gave me confidence to tackle bigger challenges.</p>

            <p>Check out the project on <a href="https://github.com/bitcodeAShishcloud/News-Aggregator" target="_blank" style="color: var(--accent);">GitHub</a>.</p>
        `
    },
    {
        id: "live-compiler-pro-real-time-collaboration",
        title: "Live Compiler Pro: Building a Real-Time Code Editor with WebRTC",
        excerpt: "Behind the scenes of Live Compiler Pro — a collaborative code editor featuring real-time sync, built-in chat, and WebRTC-based code sharing.",
        category: "Projects",
        tags: ["JavaScript", "Node.js", "Socket.io", "WebRTC"],
        date: "2026-05-05",
        readTime: "7 min read",
        author: "Ashish Gupta",
        image: "blog-images/live-compiler-pro.png",
        content: `
            <p><strong>Live Compiler Pro</strong> is a real-time collaborative code editor that lets multiple people write, edit, and run code together — perfect for pair programming sessions, live demos, and teaching.</p>

            <h2>The Idea</h2>
            <p>During college, I often wanted to code with friends remotely. Existing tools were either too heavy or required installations. I wanted something lightweight that works right in the browser — just share a link and start coding together.</p>

            <h2>Core Features</h2>
            <ul>
                <li><strong>Real-time code sync</strong> — Every keystroke is broadcast to all connected users instantly.</li>
                <li><strong>Built-in chat</strong> — A sidebar chat so you can discuss code without switching apps.</li>
                <li><strong>WebRTC sharing</strong> — Peer-to-peer connections for lower latency and better performance.</li>
                <li><strong>Live preview</strong> — See HTML/CSS/JS output update as you type.</li>
            </ul>

            <h2>Architecture</h2>
            <h3>Backend</h3>
            <p>The server is built with <strong>Node.js</strong> and <strong>Express</strong>. Socket.io handles the WebSocket connections for real-time events:</p>
            <pre><code>const io = require('socket.io')(server);

io.on('connection', (socket) => {
    socket.on('code-change', (data) => {
        // Broadcast to all other users in the same room
        socket.to(data.room).emit('code-update', data.code);
    });

    socket.on('chat-message', (msg) => {
        io.to(msg.room).emit('new-message', msg);
    });
});</code></pre>

            <h3>Frontend</h3>
            <p>The editor uses a code editor component with syntax highlighting. Changes are captured on every input event and emitted through Socket.io. Incoming updates are applied without disrupting the local user's cursor position.</p>

            <h2>Challenges</h2>
            <ul>
                <li><strong>Conflict resolution</strong> — When two users edit the same line simultaneously, changes can clash. I implemented a simple last-write-wins strategy which works well for small teams.</li>
                <li><strong>Cursor management</strong> — Applying remote changes without jumping the local cursor was tricky. I track cursor offsets before and after applying updates.</li>
                <li><strong>Room management</strong> — Each collaboration session gets a unique room ID. Users join by appending it to the URL.</li>
            </ul>

            <h2>What I Learned</h2>
            <p>This project deepened my understanding of WebSockets, real-time event architectures, and the challenges of collaborative editing. It also taught me how to structure a Node.js application for scalability.</p>

            <p>Try it live at <a href="https://live-code-nine.vercel.app/" target="_blank" style="color: var(--accent);">live-code-nine.vercel.app</a> or view the source on <a href="https://github.com/bitcodeAShishcloud/live-code" target="_blank" style="color: var(--accent);">GitHub</a>.</p>
        `
    },
    {
        id: "files-shorter-google-drive-uploader",
        title: "Files Shorter: A Client-Side File Organizer for Google Drive",
        excerpt: "How I built a zero-server file uploader that organizes uploads into Google Drive folders by subject — using just HTML and JavaScript.",
        category: "Projects",
        tags: ["Google Drive API", "JavaScript", "HTML", "Serverless"],
        date: "2026-05-01",
        readTime: "5 min read",
        author: "Ashish Gupta",
        image: "blog-images/files-shorter.png",
        content: `
            <p><strong>Files Shorter</strong> is a lightweight, client-side web application that lets users upload files directly to Google Drive, automatically organizing them into folders by subject or category. No backend server required.</p>

            <h2>The Problem</h2>
            <p>In college, we constantly share notes, assignments, and resources. Files end up scattered across WhatsApp groups, email threads, and random folders. I wanted a simple tool where anyone could upload a file, pick a subject, and have it automatically land in the right Google Drive folder.</p>

            <h2>How It Works</h2>
            <ol>
                <li>The user selects a subject from a dropdown menu.</li>
                <li>They pick one or more files to upload.</li>
                <li>The app authenticates with Google Drive using the Google API client library.</li>
                <li>Files are uploaded directly to the corresponding folder in Drive.</li>
            </ol>

            <h3>Key Code: Uploading to a Specific Folder</h3>
            <pre><code>function uploadFile(file, folderId) {
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
}</code></pre>

            <h2>Design Decisions</h2>
            <ul>
                <li><strong>No backend</strong> — Everything runs in the browser. The Google API client handles authentication via OAuth2.</li>
                <li><strong>Predefined folders</strong> — Subject folders are created in advance on Drive. The app maps subject names to folder IDs.</li>
                <li><strong>Simple UI</strong> — A clean, minimal interface that anyone can use without instructions.</li>
            </ul>

            <h2>What I Learned</h2>
            <p>Working with the Google Drive API taught me about OAuth2 flows, multipart file uploads, and the importance of keeping things simple. The entire app is under 200 lines of JavaScript.</p>

            <p>View the project on <a href="https://github.com/bitcodeAShishcloud/Files-Shorter" target="_blank" style="color: var(--accent);">GitHub</a> or try the <a href="https://bitcodeashishcloud.github.io/Files-Shorter/" target="_blank" style="color: var(--accent);">live demo</a>.</p>
        `
    },
    {
        id: "security-showcase-xss-prevention-demo",
        title: "Security Showcase: Demonstrating XSS Prevention in the Browser",
        excerpt: "A deep dive into my Security Showcase project — a hands-on demo of DOM-based XSS attacks and the defense techniques that stop them.",
        category: "Projects",
        tags: ["XSS Prevention", "JavaScript", "Frontend Security", "CSP"],
        date: "2026-04-25",
        readTime: "6 min read",
        author: "Ashish Gupta",
        image: "blog-images/security-showcase.png",
        content: `
            <p>My <strong>Security Showcase</strong> project is a frontend-only demonstration of common DOM-based Cross-Site Scripting (XSS) attacks and the layered defenses that prevent them. It's designed as an educational tool for students learning web security.</p>

            <h2>What It Demonstrates</h2>
            <p>The app has two modes:</p>
            <ul>
                <li><strong>Vulnerable Mode</strong> — Shows how unsafe DOM manipulation (like using <code>innerHTML</code> with user input) creates XSS vulnerabilities.</li>
                <li><strong>Protected Mode</strong> — Demonstrates the same functionality with proper defenses in place, showing that security doesn't have to break usability.</li>
            </ul>

            <h2>Defense Layers Implemented</h2>
            <h3>1. Safe DOM Rendering</h3>
            <p>Replacing <code>innerHTML</code> with <code>textContent</code> for user-provided strings eliminates the most common XSS vector:</p>
            <pre><code>// Vulnerable
element.innerHTML = userInput;

// Safe
element.textContent = userInput;</code></pre>

            <h3>2. Input Sanitization</h3>
            <p>When HTML rendering is necessary (e.g., a rich text preview), the input is passed through a sanitization function that strips script tags, event handlers, and dangerous attributes:</p>
            <pre><code>function sanitize(html) {
    const temp = document.createElement('div');
    temp.textContent = html;
    return temp.innerHTML;  // Escaped output
}</code></pre>

            <h3>3. Content Security Policy (CSP)</h3>
            <p>The app sets a strict CSP via a meta tag that blocks inline scripts and restricts script sources:</p>
            <pre><code>&lt;meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; script-src 'self'"&gt;</code></pre>

            <h3>4. Visual Feedback</h3>
            <p>When an XSS attempt is detected and blocked, the UI shows a red alert banner explaining what happened and why it was stopped. This makes the demo educational rather than just functional.</p>

            <h2>Why I Built It</h2>
            <p>Most XSS tutorials only explain the theory. I wanted to build something where you can actually try an attack, see it work in vulnerable mode, then switch to protected mode and see the same attack fail. Learning by doing is far more effective.</p>

            <h2>What I Learned</h2>
            <p>This project forced me to truly understand how browsers parse and execute scripts, how the DOM works at a low level, and how each defense layer contributes to overall security. It's one of the most educational projects I've done.</p>

            <p>View the source on <a href="https://github.com/bitcodeAShishcloud/security-showcase" target="_blank" style="color: var(--accent);">GitHub</a> or try the <a href="https://bitcodeashishcloud.github.io/security-showcase/" target="_blank" style="color: var(--accent);">live demo</a>.</p>
        `
    },
    {
        id: "banking-shopping-system-python",
        title: "Building a Secure Banking & Shopping System in Python",
        excerpt: "The story behind my Python desktop application featuring transaction processing, user authentication, and inventory management with security at its core.",
        category: "Projects",
        tags: ["Python", "Desktop App", "Security", "Authentication"],
        date: "2026-04-20",
        readTime: "6 min read",
        author: "Ashish Gupta",
        content: `
            <p>The <strong>Banking Shopping System</strong> is a desktop application I built in Python that combines banking operations with a shopping experience. Users can create accounts, deposit and withdraw funds, browse products, and make purchases — all with security features baked in from the start.</p>

            <h2>Core Features</h2>
            <ul>
                <li><strong>User Authentication</strong> — Account creation with hashed passwords and secure login.</li>
                <li><strong>Banking Operations</strong> — Deposit, withdraw, check balance, and view transaction history.</li>
                <li><strong>Shopping System</strong> — Browse an inventory catalog, add items to cart, and checkout using account balance.</li>
                <li><strong>Transaction Logging</strong> — Every financial operation is logged with timestamps for audit trails.</li>
            </ul>

            <h2>Security Implementation</h2>
            <h3>Password Hashing</h3>
            <p>User passwords are never stored in plain text. I use Python's <code>hashlib</code> library to hash passwords before storage:</p>
            <pre><code>import hashlib

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(input_pw, stored_hash):
    return hash_password(input_pw) == stored_hash</code></pre>

            <h3>Input Validation</h3>
            <p>Every user input is validated before processing. Withdrawal amounts are checked against the current balance, and negative values are rejected:</p>
            <pre><code>def withdraw(account, amount):
    if amount <= 0:
        print("Invalid amount.")
        return False
    if amount > account['balance']:
        print("Insufficient funds.")
        return False
    account['balance'] -= amount
    log_transaction(account['id'], 'WITHDRAW', amount)
    return True</code></pre>

            <h3>Transaction Integrity</h3>
            <p>Each transaction is recorded with a unique ID, timestamp, type (deposit/withdraw/purchase), and amount. This creates a complete audit trail that can be reviewed at any time.</p>

            <h2>Architecture</h2>
            <p>The application is structured with clear separation:</p>
            <ul>
                <li><strong>auth.py</strong> — Handles user registration, login, and password management.</li>
                <li><strong>banking.py</strong> — Manages accounts, deposits, withdrawals, and balance inquiries.</li>
                <li><strong>shop.py</strong> — Handles the product catalog, cart, and checkout flow.</li>
                <li><strong>main.py</strong> — The entry point with a menu-driven interface.</li>
            </ul>

            <h2>Challenges</h2>
            <ul>
                <li><strong>Data persistence</strong> — Without a database, I used JSON files to store account data. This required careful file handling to prevent corruption during concurrent writes.</li>
                <li><strong>Menu flow</strong> — Designing an intuitive CLI menu that guides users through banking and shopping without confusion took multiple iterations.</li>
                <li><strong>Edge cases</strong> — Handling scenarios like insufficient funds during checkout, empty cart submissions, and invalid product IDs required thorough testing.</li>
            </ul>

            <h2>What I Learned</h2>
            <p>This was my first significant Python project. It taught me about modular code design, secure data handling, and the importance of thinking about edge cases and error handling from the beginning — not as an afterthought.</p>

            <p>View the source on <a href="https://github.com/bitcodeAShishcloud/banking-shopping-system/" target="_blank" style="color: var(--accent);">GitHub</a>.</p>
        `
    },
    {
        id: "understanding-xss-prevention",
        title: "Understanding and Preventing Cross-Site Scripting (XSS)",
        excerpt: "A practical guide to identifying, exploiting, and defending against DOM-based XSS vulnerabilities in modern web applications.",
        category: "Web Security",
        tags: ["XSS", "Frontend Security", "JavaScript"],
        date: "2026-05-20",
        readTime: "6 min read",
        author: "Ashish Gupta",
        content: `
            <p>Cross-Site Scripting (XSS) remains one of the most common web application vulnerabilities. It allows attackers to inject malicious scripts into web pages viewed by other users, potentially stealing cookies, session tokens, or other sensitive information.</p>

            <h2>What is XSS?</h2>
            <p>XSS occurs when an application includes untrusted data in a web page without proper validation or escaping. There are three main types:</p>
            <ul>
                <li><strong>Stored XSS</strong> — The malicious script is permanently stored on the target server (e.g., in a database).</li>
                <li><strong>Reflected XSS</strong> — The script is reflected off a web server in error messages, search results, or any response that includes input from a user.</li>
                <li><strong>DOM-based XSS</strong> — The vulnerability exists entirely in client-side code. The attack payload is executed by modifying the DOM in the victim's browser.</li>
            </ul>

            <h2>A Simple Example</h2>
            <p>Consider a search page that displays the user's query:</p>
            <pre><code>// Vulnerable code — DO NOT USE
document.getElementById('results').innerHTML = 
    'You searched for: ' + userInput;</code></pre>
            <p>If <code>userInput</code> contains <code>&lt;img src=x onerror=alert('XSS')&gt;</code>, the browser will execute the attacker's script.</p>

            <h2>Prevention Techniques</h2>
            <h3>1. Escape Output</h3>
            <p>Always escape user input before rendering it in HTML. Use <code>textContent</code> instead of <code>innerHTML</code> when inserting plain text:</p>
            <pre><code>// Safe approach
document.getElementById('results').textContent = 
    'You searched for: ' + userInput;</code></pre>

            <h3>2. Content Security Policy (CSP)</h3>
            <p>A CSP header restricts the sources from which scripts can be loaded. This prevents inline scripts from executing even if an attacker injects them:</p>
            <pre><code>Content-Security-Policy: default-src 'self'; script-src 'self'</code></pre>

            <h3>3. Input Validation</h3>
            <p>Validate and sanitize all user inputs on both client and server side. Use allowlists for expected formats (e.g., email, numbers) rather than blocklists.</p>

            <h3>4. Use a Sanitization Library</h3>
            <p>When you must render user-provided HTML, use libraries like <strong>DOMPurify</strong> to strip dangerous elements and attributes:</p>
            <pre><code>import DOMPurify from 'dompurify';
const clean = DOMPurify.sanitize(dirtyHTML);
element.innerHTML = clean;</code></pre>

            <h2>Key Takeaways</h2>
            <ul>
                <li>Never trust user input — always validate and sanitize.</li>
                <li>Prefer <code>textContent</code> over <code>innerHTML</code>.</li>
                <li>Implement Content Security Policy headers.</li>
                <li>Use established sanitization libraries when rendering HTML.</li>
                <li>Regularly test your application with tools like Burp Suite or OWASP ZAP.</li>
            </ul>
        `
    },
    {
        id: "network-traffic-analysis-wireshark",
        title: "A Student's Guide to Network Traffic Analysis with Wireshark",
        excerpt: "Learn how to capture, filter, and analyze network packets using Wireshark — the essential skill for any aspiring cybersecurity professional.",
        category: "Network Security",
        tags: ["Wireshark", "Packet Analysis", "Networking"],
        date: "2026-05-15",
        readTime: "8 min read",
        author: "Ashish Gupta",
        content: `
            <p>Wireshark is the world's most popular network protocol analyzer. Whether you're troubleshooting a network issue or investigating a security incident, understanding how to read packet captures is a fundamental skill in cybersecurity.</p>

            <h2>Getting Started</h2>
            <p>Download Wireshark from <strong>wireshark.org</strong> and install it on your machine. On Linux, you can install it with:</p>
            <pre><code>sudo apt update
sudo apt install wireshark</code></pre>
            <p>When you launch Wireshark, you'll see a list of network interfaces. Select the one you want to monitor (e.g., <code>eth0</code> or <code>wlan0</code>) and click the shark fin icon to start capturing.</p>

            <h2>Understanding the Interface</h2>
            <p>Wireshark's main window is divided into three panes:</p>
            <ul>
                <li><strong>Packet List</strong> — A summary of each captured packet (time, source, destination, protocol, info).</li>
                <li><strong>Packet Details</strong> — A tree-view breakdown of the selected packet's protocol layers.</li>
                <li><strong>Packet Bytes</strong> — The raw hexadecimal and ASCII data of the selected packet.</li>
            </ul>

            <h2>Essential Display Filters</h2>
            <p>Display filters let you narrow down the packets you see. Here are some commonly used ones:</p>
            <pre><code># Show only HTTP traffic
http

# Filter by IP address
ip.addr == 192.168.1.100

# Show only DNS queries
dns

# Filter by TCP port
tcp.port == 443

# Show only packets with a specific flag
tcp.flags.syn == 1 && tcp.flags.ack == 0</code></pre>

            <h2>Practical Exercise: Analyzing an HTTP Session</h2>
            <ol>
                <li>Start a capture on your active interface.</li>
                <li>Open a browser and visit an HTTP website (not HTTPS, so you can see the traffic in plain text).</li>
                <li>Stop the capture.</li>
                <li>Apply the filter <code>http</code>.</li>
                <li>Right-click on a GET request and select <strong>Follow → TCP Stream</strong>.</li>
                <li>You'll see the full HTTP request and response, including headers and body content.</li>
            </ol>

            <h2>Saving and Sharing Captures</h2>
            <p>You can save your capture as a <code>.pcap</code> or <code>.pcapng</code> file for later analysis or to share with your team. Go to <strong>File → Save As</strong> and choose your format.</p>

            <h2>Tips for Beginners</h2>
            <ul>
                <li>Always capture on your own network or with explicit permission.</li>
                <li>Use capture filters to reduce file size when monitoring high-traffic networks.</li>
                <li>Learn the OSI model — it makes understanding packet layers much easier.</li>
                <li>Practice with sample captures from <strong>wiki.wireshark.org/SampleCaptures</strong>.</li>
            </ul>
        `
    },
    {
        id: "building-cybersecurity-home-lab",
        title: "Building a Virtual Cyber Range: Home Lab Guide",
        excerpt: "Set up your own cybersecurity home lab with VirtualBox, Kali Linux, and vulnerable target machines for safe, legal hands-on practice.",
        category: "Home Lab",
        tags: ["VirtualBox", "Kali Linux", "Lab Setup", "Practice"],
        date: "2026-05-10",
        readTime: "7 min read",
        author: "Ashish Gupta",
        content: `
            <p>One of the best ways to learn cybersecurity is by building your own home lab. A virtual cyber range gives you a safe, isolated environment to practice offensive and defensive techniques without risking real systems or breaking any laws.</p>

            <h2>What You'll Need</h2>
            <ul>
                <li><strong>Hardware</strong> — A computer with at least 8 GB RAM and 100 GB free disk space. 16 GB RAM is recommended.</li>
                <li><strong>Hypervisor</strong> — VirtualBox (free) or VMware Workstation Player (free for personal use).</li>
                <li><strong>Attacker VM</strong> — Kali Linux or Parrot Security OS.</li>
                <li><strong>Target VMs</strong> — Intentionally vulnerable machines like Metasploitable 2, DVWA, or OWASP WebGoat.</li>
            </ul>

            <h2>Step 1: Install VirtualBox</h2>
            <p>Download VirtualBox from <strong>virtualbox.org</strong> and install it. Also install the Extension Pack for USB support and other features.</p>

            <h2>Step 2: Set Up Kali Linux</h2>
            <p>Download the pre-built Kali Linux VirtualBox image from <strong>kali.org</strong>. Import the <code>.ova</code> file into VirtualBox:</p>
            <pre><code>File → Import Appliance → Select the .ova file → Import</code></pre>
            <p>Default credentials are <code>kali / kali</code>. Change the password immediately after first login.</p>

            <h2>Step 3: Set Up a Target Machine</h2>
            <p>Download Metasploitable 2 — a deliberately vulnerable Linux VM. Extract the archive and create a new VM in VirtualBox pointing to the extracted <code>.vmdk</code> disk file.</p>

            <h2>Step 4: Network Configuration</h2>
            <p>This is the most important step. You want your VMs to communicate with each other but <strong>not</strong> with the outside world:</p>
            <ol>
                <li>In VirtualBox, go to <strong>File → Host Network Manager</strong> and create a new host-only network (e.g., <code>vboxnet0</code>).</li>
                <li>Set both VMs' network adapters to <strong>Host-only Adapter</strong> using <code>vboxnet0</code>.</li>
                <li>Boot both VMs and verify they can ping each other.</li>
            </ol>
            <pre><code># On Kali, find your IP
ip addr show

# Ping the target
ping 192.168.56.101</code></pre>

            <h2>Step 5: Start Practicing</h2>
            <p>With your lab running, try these beginner exercises:</p>
            <ul>
                <li><strong>Nmap scanning</strong> — Discover open ports and services on the target.</li>
                <li><strong>Metasploit</strong> — Use the framework to exploit known vulnerabilities on Metasploitable.</li>
                <li><strong>Web app testing</strong> — Set up DVWA on the target and practice SQL injection, XSS, and file upload attacks.</li>
                <li><strong>Wireshark</strong> — Capture and analyze the traffic between your attacker and target.</li>
            </ul>

            <h2>Safety Reminders</h2>
            <ul>
                <li>Never connect vulnerable VMs to your real network or the internet.</li>
                <li>Always use host-only or internal networking for your lab.</li>
                <li>Take VM snapshots before making changes so you can revert easily.</li>
                <li>Only practice on systems you own or have explicit permission to test.</li>
            </ul>
        `
    }
];
