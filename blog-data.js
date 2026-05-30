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
        image: "blog-images/news-aggregator.webp",
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
        excerpt: "Behind the scenes of Live Compiler Pro — real-time collab rooms, live chat with photo sharing, and WebRTC-based code editing in the browser.",
        category: "Projects",
        tags: ["JavaScript", "Node.js", "Socket.io", "WebRTC"],
        date: "2026-05-05",
        readTime: "10 min read",
        author: "Ashish Gupta",
        image: "blog-images/live-compiler-pro.webp",
        content: `
            <p><strong>Live Compiler Pro</strong> is a browser-based IDE at <a href="https://live-code-hxft.onrender.com/" target="_blank" style="color: var(--accent);">live-code-hxft.onrender.com</a> that supports multi-language editing, live preview, a built-in console, and real-time collaboration — ideal for pair programming, demos, and teaching.</p>

            <h2>The Idea</h2>
            <p>During college, I often wanted to code with friends remotely. Existing tools were either too heavy or required installations. I wanted something lightweight that works right in the browser — open the app, share a room code, and start coding together.</p>

            <h2>Core Features</h2>
            <ul>
                <li><strong>Multi-language editor</strong> — HTML, CSS, JavaScript, Python, JSON, and Markdown with syntax highlighting.</li>
                <li><strong>Live preview</strong> — Run code manually or switch to Auto Run for instant HTML/CSS/JS updates.</li>
                <li><strong>Built-in console</strong> — View logs, warnings, and errors; run JavaScript from the console input.</li>
                <li><strong>Files &amp; export</strong> — Create files, import from disk, rename tabs, and export as ZIP or individual files.</li>
                <li><strong>Theme toggle</strong> — Dark and light modes for comfortable long sessions.</li>
                <li><strong>Code snippets</strong> — Quick templates to bootstrap common patterns.</li>
            </ul>

            <h2>Live Collaboration (Collab)</h2>
            <p>The <strong>Collab</strong> button in the header opens the <strong>Live Collaboration</strong> panel — the heart of real-time pair programming in Live Compiler Pro. You can code together with classmates or teammates without installing anything extra.</p>

            <figure style="margin: 2rem 0; text-align: center;">
                <img src="blog-images/live-compiler-collab.png" alt="Live Collaboration modal showing room code, P2P mode, and host controls" class="reader-hero-img" style="display: block; margin: 0 auto;">
                <figcaption style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 0.75rem;">Live Collaboration room — create a session, get a 12-character code, and invite others to join.</figcaption>
            </figure>

            <h3>Two ways to collaborate</h3>
            <ul>
                <li><strong>Anywhere (P2P)</strong> — Connect with others over the internet using peer-to-peer networking. Best when you and your partner are on different networks or cities. The host sees a status badge (<em>Connected</em> / <em>Host</em>) and a shareable room code.</li>
                <li><strong>Same Browser</strong> — Mirror code across tabs in the same browser with <strong>Tab Sync</strong>. Handy for testing responsive layouts or comparing two versions side by side without a network room.</li>
            </ul>

            <h3>How a live room works</h3>
            <ol>
                <li>Click <strong>Collab</strong> in the toolbar, then choose a username (shown to others in the room).</li>
                <li><strong>Create &amp; Join Room</strong> — you become the host and receive a <strong>12-character room code</strong> (for example <code>HGAH1QTS29ST</code>).</li>
                <li>Share the code via <strong>Copy invite &amp; share</strong> — teammates paste it under <strong>Join a room</strong> and click <strong>Join</strong>.</li>
                <li>Everyone edits the same workspace in real time while the <strong>Chat</strong> sidebar stays open for live discussion.</li>
                <li>Hosts can <strong>Reconnect</strong> if the session drops or <strong>Leave Room</strong> to end their participation.</li>
            </ol>

            <h3>Live Chat inside Collab rooms</h3>
            <p>Collaboration is not just shared code — you also get a built-in <strong>Chat</strong> panel on the left so you never have to switch to WhatsApp or Discord mid-debug. On <a href="https://live-code-hxft.onrender.com/" target="_blank" style="color: var(--accent);">Live Compiler Pro</a>, chat is tied directly to the active room: text and images stay in the same thread as your live coding session.</p>

            <figure style="margin: 2rem 0; text-align: center;">
                <img src="blog-images/live-compiler-chat.png" alt="Live Compiler Pro chat sidebar with room code, online users, and message input with image attach button" class="reader-hero-img" style="display: block; margin: 0 auto;">
                <figcaption style="color: var(--text-secondary); font-size: 0.9rem; margin-top: 0.75rem;">In-room chat — send messages and share photos without leaving the editor.</figcaption>
            </figure>

            <p>Once you connect, the chat header shows your status (for example <em>“Connected. Enter a name and room to start.”</em> until you join). After entering a room:</p>
            <ul>
                <li><strong>Room bar</strong> — The active code (e.g. <code>HGAH1QTS29ST</code>) appears at the top with a one-click copy button and a live participant count.</li>
                <li><strong>Online Users</strong> — See who is in the session (e.g. <em>Ashish (you)</em>) with a green online indicator so you know when teammates are present.</li>
                <li><strong>System messages</strong> — Join events like <em>“You joined room HGAH1QTS29ST”</em> appear in the thread so everyone knows when someone enters.</li>
                <li><strong>Live messaging</strong> — Type in <em>“Type a message…”</em> at the bottom and hit send — messages sync instantly to everyone in that room.</li>
                <li><strong>Leave Room</strong> — A dedicated button exits the session cleanly without closing the whole editor.</li>
            </ul>

            <h3>Share photos right in the chat</h3>
            <p>Text alone is not always enough when you are debugging or reviewing UI. Next to the message box you will see an <strong>image attach</strong> button (picture icon) — tap it, pick a photo from your device, and it is sent into the room chat for everyone to see. No need to upload to Google Drive, paste Imgur links, or open another app.</p>

            <p>That makes the chat feel closer to a modern messaging app, but it stays inside your coding workspace. Useful scenarios include:</p>
            <ul>
                <li><strong>Bug screenshots</strong> — Capture a broken layout or console error and drop it in chat so your partner sees exactly what you mean.</li>
                <li><strong>Design references</strong> — Share a mockup or Figma export while you implement HTML/CSS together in the editor.</li>
                <li><strong>Assignment clarifications</strong> — During college labs, paste a photo of the question sheet or rubric so the whole group stays aligned.</li>
                <li><strong>Quick visual feedback</strong> — After a code change, screenshot the live preview and ask <em>“Does this spacing look right?”</em> without screen-sharing software.</li>
                <li><strong>Security demos</strong> — In cyber workshops, share evidence images (logs, Wireshark captures, alert screens) while discussing fixes in real time.</li>
            </ul>

            <p>Photos appear inline in the chat thread alongside text messages, so the conversation reads naturally — explain the issue in words, attach the proof in one click, and keep coding in the center panel. For remote pair programming, this removes the awkward loop of <em>“wait, let me send this on WhatsApp”</em> and keeps code, preview, console, and communication in a single browser tab.</p>

            <p>This matters during pair programming: one person can explain a fix in chat (or share a screenshot of the problem) while the other applies it in the editor, preview updates on the right, and console output confirms the result — all without context switching.</p>

            <p>When a room is created successfully, the app confirms with a message like <em>“Room created — you're in! Share the code to invite others.”</em> That flow keeps onboarding simple for non-technical users during lab sessions or hackathons.</p>

            <h3>Why Collab matters for learning</h3>
            <p>Remote cyber labs and project reviews often need a shared screen. With Live Compiler Pro, an instructor can host a room, students join with one code, and everyone sees the same files, preview, and console output. Combined with Manual/Auto run modes and keyboard shortcuts (Ctrl/Cmd+S to run, Ctrl/Cmd+B for the sidebar), it feels close to a desktop IDE while staying 100% in the browser.</p>

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

            <p>Try it live at <a href="https://live-code-hxft.onrender.com/" target="_blank" style="color: var(--accent);">live-code-hxft.onrender.com</a> or view the source on <a href="https://github.com/bitcodeAShishcloud/live-code" target="_blank" style="color: var(--accent);">GitHub</a>.</p>
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
        image: "blog-images/files-shorter.webp",
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
        image: "blog-images/security-showcase.webp",
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
