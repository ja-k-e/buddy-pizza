const last = { key: "", time: 0, count: 0 };
go();

function go() {
  setTimeout(go, 10000);
  const profiles = {};
  const streams = {};

  const params = new URLSearchParams(location.search);
  const source = params.get("s") || "social.buddy.pizza";

  document.body.addEventListener("keyup", ({ code }) => {
    if (code === "Escape") {
      const div = document.querySelector("div.overlay");
      if (div) {
        div.remove();
      }
    }
  });

  run(source);

  async function run(domain) {
    try {
      const following = await (
        await fetch(`https://${domain}/following.json`)
      ).json();
      const promises = following.map(fetchDataForDomain);
      await Promise.all(promises);
      let stream = [];
      for (let key in streams) {
        const items = streams[key].map((item) => ({ key, ...item }));
        stream = stream.concat(items);
      }
      stream.sort((a, b) => b.time - a.time);
      render(stream);
    } catch (e) {
      render([]);
    }
  }

  function render(stream) {
    const item = stream[0] || {};
    if (
      stream.length === last.count &&
      item.key === last.key &&
      item.time === last.time
    ) {
      return;
    }
    last.count = stream.length;
    last.key = item.key;
    last.time = item.time;
    const ul = document.getElementById("feed");
    ul.innerHTML = "";
    stream.forEach((post) => {
      const li = document.createElement("li");
      li.id = idFromKeyAndTime(post.key, post.time);
      ul.appendChild(li);
      const profileA = profiles[post.key];
      const at = profileA["@"];
      let { text } = post;
      text = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      text = textWithLinks(text);
      text = textWithReply(post.key, text);
      const img = imgFromPost(post.image, text);
      const url = urlFromPost(post.url);
      const replyUrl = `post/?t=@${post.key}%23${post.time}%20your%20reply%20here`;
      const timeString = new Date(post.time).toLocaleString();
      const authorLink = `<a class="a" href="https://${post.key}" title="${profileA.name}">${at}</a>`;
      const timeLink = `<a class="t" title="${timeString}" href="${replyUrl}">${post.time}</a>`;
      li.innerHTML = `<p class="${classNameFromText(text)}">
            ${img}
            <span>${text}</span>
            ${url}
            ${authorLink}
          ${timeLink}
          </p>`;
    });
    document.querySelectorAll("a.t").forEach((anchor) => {
      anchor.addEventListener("click", (e) => {
        e.preventDefault();
        showIframe(anchor.href);
      });
    });
  }

  function showIframe(href) {
    const div = document.createElement("div");
    div.className = "overlay";
    div.innerHTML = `<button id="close" type="button">&nbsp;</button><iframe src="${href}"></iframe>`;
    document.body.appendChild(div);
    document
      .getElementById("close")
      .addEventListener("click", () => div.remove());
  }

  function fetchDataForDomain(url) {
    return new Promise(async (resolve, reject) => {
      try {
        const stream = await fetch(`https://${url}/stream.json`);
        const profile = await fetch(`https://${url}/profile.json`);
        const key = url;
        streams[key] = await stream.json();
        profiles[key] = await profile.json();
        const imageUrl = profiles[key].image;
        if (!imageUrl) {
          profiles[key].image = { url: `${url}/image.jpg` };
        } else if (typeof imageUrl === "string") {
          profiles[key].image = { url: imageUrl };
        }
        resolve();
      } catch (e) {
        resolve();
      }
    });
  }

  function classNameFromText(text) {
    if (text.length < 25) {
      return "xs";
    }
    if (text.length < 50) {
      return "sm";
    }
    if (text.length < 100) {
      return "md";
    }
    if (text.length < 200) {
      return "lg";
    }
    return "xl";
  }

  function urlFromPost(url) {
    if (!url) {
      return "";
    }
    return url ? textWithLinks(url, "link") : "";
  }

  function imgFromPost(image, text) {
    if (!image) {
      return "";
    }
    const { url, alt = text, height = 300, width = 300 } = image;
    return `<img class="img" src="${url}" alt="${alt}" height="${height}" width="${width}" />`;
  }

  function idFromKeyAndTime(key, time) {
    return `z-${key.replace(/\./g, "-")}-${time}`;
  }

  function textWithReply(key, text) {
    const reply = text.match(/^@([^ ]+)#(\d+) /);
    if (reply) {
      const [_, domain, timestamp] = reply;
      const profileB = profiles[domain];
      const nameB = (profileB ? profileB["@"] : "?") || "?";
      const mention = domain === key ? "+" : `@${nameB}`;
      text = text.replace(
        reply[0],
        `<a href="#${idFromKeyAndTime(domain, timestamp)}">${mention}</a> `
      );
    }
    return text;
  }

  function textWithLinks(text, className = "") {
    return text.replace(
      /(\b(https?:\/\/)([-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|]))/i,
      `<a href="$1" class="${className}">$3</a>`
    );
  }
}
