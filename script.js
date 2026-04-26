function addTask() {
  const input = document.getElementById("taskInput");
  const taskText = input.value.trim();

  if (taskText === "") return;

  const li = document.createElement("li");
  li.innerHTML = `
    <span onclick="toggleTask(this)">${taskText}</span>
    <button onclick="deleteTask(this)">❌</button>
  `;

  document.getElementById("taskList").appendChild(li);

  input.value = "";
}

function deleteTask(button) {
  button.parentElement.remove();
}

function toggleTask(span) {
  span.parentElement.classList.toggle("completed");
}

const faqs = document.querySelectorAll(".faq-item");

faqs.forEach(item => {
  const question = item.querySelector(".faq-question");

  question.addEventListener("click", () => {
    item.classList.toggle("active");
  });
});

const counters = document.querySelectorAll(".count");
let started = false; // prevents repeat

const startCounting = () => {
  if (started) return;
  started = true;

  counters.forEach(counter => {
    const target = +counter.getAttribute("data-target");
    let count = 0;

    const update = () => {
      const increment = target / 100;

      if (count < target) {
        count += increment;
        counter.innerText = Math.floor(count) + "+";
        requestAnimationFrame(update);
      } else {
        counter.innerText = target + "+";
      }
    };

    update();
  });
};

/* TRIGGER ON SCROLL INTO VIEW */
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      startCounting();
    }
  });
}, {
  threshold: 0.5 // starts when 50% visible
});

observer.observe(document.querySelector(".stats"));

function showPopup(message, type) {
  const popup = document.getElementById("popup");

  popup.innerText = message;
  popup.className = "popup show " + type;

  setTimeout(() => {
    popup.classList.remove("show");
  }, 3000);
}

function sendQuestion() {
  const input = document.getElementById("questionInput");
  const value = input.value.trim();

  if (value === "") {
    showPopup("Please enter your question!", "error");
    return;
  }

  showPopup("Question sent successfully! 🚀", "success");

  input.value = "";
}

const toggleBtn = document.getElementById("themeToggle");

/* LOAD SAVED THEME */
if (localStorage.getItem("theme") === "dark") {
  document.body.classList.add("dark");
}

/* TOGGLE */
toggleBtn.addEventListener("click", () => {
  document.body.classList.toggle("dark");

  if (document.body.classList.contains("dark")) {
    localStorage.setItem("theme", "dark");
    toggleBtn.innerText = "☀️";
  } else {
    localStorage.setItem("theme", "light");
    toggleBtn.innerText = "🌙";
  }
});