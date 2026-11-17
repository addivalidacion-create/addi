const toast = document.querySelector("#toast");
    const menuToggle = document.querySelector(".menu-toggle");
    const navLinks = document.querySelector("#nav-links");
    let toastTimer;

    document.querySelectorAll("[data-demo]").forEach((button) => {
      button.addEventListener("click", () => {
        toast.textContent = "Demo visual: esta acción no inicia una solicitud ni comparte tus datos.";
        toast.classList.add("show");
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => toast.classList.remove("show"), 3600);
      });
    });

    menuToggle.addEventListener("click", () => {
      const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
      menuToggle.setAttribute("aria-expanded", String(!isOpen));
      menuToggle.setAttribute("aria-label", isOpen ? "Abrir menú" : "Cerrar menú");
      navLinks.classList.toggle("open", !isOpen);
    });

    navLinks.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        navLinks.classList.remove("open");
        menuToggle.setAttribute("aria-expanded", "false");
      });
    });
