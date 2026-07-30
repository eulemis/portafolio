/**
 * CV: i18n + PDF visual (layout continuo original) + ATS (TXT + PDF)
 */
(function () {
  const STORAGE_KEY = "cv-lang";
  const cv = document.getElementById("cv");
  const btnPdf = document.getElementById("btn-pdf");
  const btnPdfAts = document.getElementById("btn-pdf-ats");
  const btnPrint = document.getElementById("btn-print");
  const langButtons = document.querySelectorAll(".lang-btn");

  const saved = localStorage.getItem(STORAGE_KEY);
  const browserEs = (navigator.language || "").toLowerCase().startsWith("es");
  let currentLang = saved === "en" || saved === "es" ? saved : browserEs ? "es" : "es";

  function t(key) {
    const dict = window.CV_I18N?.[currentLang] || {};
    return dict[key] ?? window.CV_I18N?.en?.[key] ?? key;
  }

  function stripHtml(html) {
    const tmp = document.createElement("div");
    tmp.innerHTML = html || "";
    return (tmp.textContent || tmp.innerText || "").replace(/\s+/g, " ").trim();
  }

  function applyLanguage(lang) {
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;

    const dict = window.CV_I18N?.[lang];
    if (!dict) return;

    document.title = dict.docTitle;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", dict.docDescription);

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (dict[key] != null) el.textContent = dict[key];
    });

    document.querySelectorAll("[data-i18n-html]").forEach((el) => {
      const key = el.getAttribute("data-i18n-html");
      if (dict[key] != null) el.innerHTML = dict[key];
    });

    document.querySelectorAll("[data-i18n-alt]").forEach((el) => {
      const key = el.getAttribute("data-i18n-alt");
      if (dict[key] != null) el.setAttribute("alt", dict[key]);
    });

    document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
      const key = el.getAttribute("data-i18n-aria");
      if (dict[key] != null) el.setAttribute("aria-label", dict[key]);
    });

    langButtons.forEach((btn) => {
      const active = btn.getAttribute("data-lang") === lang;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  langButtons.forEach((btn) => {
    btn.addEventListener("click", () => applyLanguage(btn.getAttribute("data-lang")));
  });

  applyLanguage(currentLang);

  if (btnPrint) {
    btnPrint.addEventListener("click", () => window.print());
  }

  async function waitFonts() {
    if (document.fonts?.ready) await document.fonts.ready;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }

  function requireHtml2Pdf() {
    if (typeof html2pdf === "undefined") {
      throw new Error(
        currentLang === "es"
          ? "No se cargo html2pdf. Revisa la conexion o recarga la pagina."
          : "html2pdf failed to load. Check connection or refresh."
      );
    }
  }

  /**
   * Clon continuo del CV (mismo layout que en pantalla).
   * No fuerza page-break-inside:avoid en bloques grandes:
   * eso era lo que generaba páginas casi vacías.
   */
  function buildVisualClone() {
    const clone = cv.cloneNode(true);
    clone.id = "cv-pdf-clone";
    clone.classList.add("cv--pdf-capture");
    clone.style.width = "794px";
    clone.style.maxWidth = "794px";
    clone.style.margin = "0";
    clone.style.boxShadow = "none";
    clone.style.borderRadius = "0";
    return clone;
  }

  function openStage(root, widthPx, label) {
    const stage = document.createElement("div");
    stage.className = "pdf-stage";
    stage.innerHTML =
      '<div class="pdf-stage__banner">' +
      (label || (currentLang === "es" ? "Generando PDF…" : "Generating PDF…")) +
      "</div>";

    const canvas = document.createElement("div");
    canvas.className = "pdf-stage__canvas";
    canvas.style.width = widthPx + "px";

    root.style.width = widthPx + "px";
    root.style.background = "#ffffff";
    root.style.opacity = "1";
    canvas.appendChild(root);
    stage.appendChild(canvas);
    document.body.appendChild(stage);
    document.body.classList.add("is-pdf-exporting");
    return stage;
  }

  function closeStage(stage) {
    document.body.classList.remove("is-pdf-exporting");
    if (stage && stage.parentNode) stage.parentNode.removeChild(stage);
  }

  async function exportElementToPdf(element, filename) {
    requireHtml2Pdf();
    await waitFonts();
    await new Promise((r) => setTimeout(r, 200));

    const opt = {
      margin: [5, 5, 5, 5],
      filename,
      image: { type: "jpeg", quality: 0.98 },
      enableLinks: false,
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        letterRendering: false,
        backgroundColor: "#ffffff",
        logging: false,
        scrollX: 0,
        scrollY: 0,
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      /* Sin avoid-all: evita saltos con hojas casi en blanco */
      pagebreak: { mode: ["css", "legacy"] },
    };

    await html2pdf().set(opt).from(element).save();
  }

  if (btnPdf && cv) {
    btnPdf.addEventListener("click", async () => {
      const originalLabel = btnPdf.textContent;
      btnPdf.disabled = true;
      btnPdf.textContent = t("btnPdfLoading");

      let stage = null;
      try {
        const clone = buildVisualClone();
        stage = openStage(clone, 794, t("btnPdfLoading"));
        await exportElementToPdf(clone, t("pdfFilename"));
      } catch (err) {
        console.error(err);
        alert(
          (currentLang === "es"
            ? "No se pudo generar el PDF."
            : "Could not generate the PDF.") +
            (err?.message ? "\n\n" + err.message : "")
        );
      } finally {
        closeStage(stage);
        btnPdf.disabled = false;
        btnPdf.textContent = originalLabel;
      }
    });
  }

  function buildAtsRoot() {
    const d = window.CV_I18N[currentLang];
    const root = document.createElement("div");
    root.id = "pdf-ats-root";
    root.className = "ats-root";

    const h1 = document.createElement("h1");
    h1.textContent = "Eulemis Hernández";
    root.appendChild(h1);

    const headline = document.createElement("p");
    headline.className = "ats-headline";
    headline.textContent = d.headlineShort || d.headline;
    root.appendChild(headline);

    const contact = document.createElement("p");
    contact.className = "ats-contact";
    contact.textContent = [d.location, d.email, d.phone, d.linkedin, d.github]
      .filter(Boolean)
      .join("  |  ");
    root.appendChild(contact);

    function addSection(title, bodyEl) {
      const h = document.createElement("h2");
      h.textContent = title;
      root.appendChild(h);
      root.appendChild(bodyEl);
    }

    const profile = document.createElement("p");
    profile.textContent = d.profile;
    addSection(d.profileTitle, profile);

    const skills = document.createElement("div");
    [
      ["backend", "backendSkills"],
      ["frontend", "frontendSkills"],
      ["databases", "dbSkills"],
      ["cloud", "cloudSkills"],
      ["payments", "paymentSkills"],
    ].forEach(([labelKey, skillsKey]) => {
      const p = document.createElement("p");
      p.innerHTML = "<strong>" + d[labelKey] + ":</strong> " + d[skillsKey];
      skills.appendChild(p);
    });
    addSection(d.coreStack, skills);

    const exp = document.createElement("div");
    const jobs = [
      {
        role: "job1Role",
        dates: "job1Dates",
        company: "job1Company",
        bullets: ["job1_1", "job1_2", "job1_3", "job1_4", "job1_5", "job1_6", "job1_7"],
      },
      {
        role: "job2Role",
        dates: "job2Dates",
        company: "job2Company",
        bullets: ["job2_1", "job2_2", "job2_3", "job2_4", "job2_5", "job2_6"],
      },
      {
        role: "job3Role",
        dates: "job3Dates",
        company: "job3Company",
        bullets: ["job3_1", "job3_2", "job3_3", "job3_4"],
      },
      {
        role: "job4Role",
        dates: "job4Dates",
        company: "job4Company",
        bullets: ["job4_1", "job4_2", "job4_3", "job4_4"],
      },
      {
        role: "job5Role",
        dates: "job5Dates",
        company: "job5Company",
        bullets: ["job5_1", "job5_2", "job5_3"],
      },
    ];

    jobs.forEach((job) => {
      const block = document.createElement("div");
      block.className = "ats-job";
      const title = document.createElement("h3");
      title.textContent = d[job.role] + "  |  " + d[job.dates];
      block.appendChild(title);
      const company = document.createElement("p");
      company.className = "ats-company";
      company.textContent = d[job.company];
      block.appendChild(company);
      const ul = document.createElement("ul");
      job.bullets.forEach((key) => {
        const li = document.createElement("li");
        li.textContent = stripHtml(d[key]);
        ul.appendChild(li);
      });
      block.appendChild(ul);
      exp.appendChild(block);
    });
    addSection(d.expTitle, exp);

    const edu = document.createElement("div");
    const school = document.createElement("p");
    school.innerHTML = "<strong>" + d.eduSchool + "</strong>";
    edu.appendChild(school);
    const degree = document.createElement("p");
    degree.textContent = d.eduDegree;
    edu.appendChild(degree);
    const certsTitle = document.createElement("p");
    certsTitle.innerHTML = "<strong>" + d.certsTitle + "</strong>";
    edu.appendChild(certsTitle);
    const certUl = document.createElement("ul");
    [d.cert1, d.cert2].forEach((c) => {
      const li = document.createElement("li");
      li.textContent = stripHtml(c);
      certUl.appendChild(li);
    });
    edu.appendChild(certUl);
    addSection(d.eduTitle, edu);

    const strengths = document.createElement("p");
    const list = [];
    for (let i = 1; i <= 12; i++) list.push(d["strength" + i]);
    strengths.textContent = list.join("  |  ");
    addSection(d.strengths, strengths);

    const langs = document.createElement("p");
    langs.textContent = d.languageValue;
    addSection(d.languages, langs);

    return root;
  }

  function downloadAtsTxt() {
    const d = window.CV_I18N[currentLang];
    const lines = [];
    const push = (s) => lines.push(s);
    const blank = () => lines.push("");

    push("EULEMIS HERNANDEZ");
    push(d.headlineShort || d.headline);
    push([d.location, d.email, d.phone, d.linkedin, d.github].filter(Boolean).join(" | "));
    blank();
    push(d.profileTitle.toUpperCase());
    push(d.profile);
    blank();
    push(d.coreStack.toUpperCase());
    push(d.backend + ": " + d.backendSkills);
    push(d.frontend + ": " + d.frontendSkills);
    push(d.databases + ": " + d.dbSkills);
    push(d.cloud + ": " + d.cloudSkills);
    push(d.payments + ": " + d.paymentSkills);
    blank();
    push(d.expTitle.toUpperCase());

    const jobs = [
      ["job1Role", "job1Dates", "job1Company", ["job1_1", "job1_2", "job1_3", "job1_4", "job1_5", "job1_6", "job1_7"]],
      ["job2Role", "job2Dates", "job2Company", ["job2_1", "job2_2", "job2_3", "job2_4", "job2_5", "job2_6"]],
      ["job3Role", "job3Dates", "job3Company", ["job3_1", "job3_2", "job3_3", "job3_4"]],
      ["job4Role", "job4Dates", "job4Company", ["job4_1", "job4_2", "job4_3", "job4_4"]],
      ["job5Role", "job5Dates", "job5Company", ["job5_1", "job5_2", "job5_3"]],
    ];

    jobs.forEach(([role, dates, company, bullets]) => {
      push(d[role] + " | " + d[dates]);
      push(d[company]);
      bullets.forEach((k) => push("- " + stripHtml(d[k])));
      blank();
    });

    push(d.eduTitle.toUpperCase());
    push(d.eduSchool);
    push(d.eduDegree);
    push(d.certsTitle);
    push("- " + stripHtml(d.cert1));
    push("- " + stripHtml(d.cert2));
    blank();
    push(d.strengths.toUpperCase());
    const s = [];
    for (let i = 1; i <= 12; i++) s.push(d["strength" + i]);
    push(s.join(" | "));
    blank();
    push(d.languages.toUpperCase());
    push(d.languageValue);

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = t("pdfFilenameAts").replace(/\.pdf$/i, ".txt");
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (btnPdfAts) {
    btnPdfAts.addEventListener("click", async () => {
      const originalLabel = btnPdfAts.textContent;
      btnPdfAts.disabled = true;
      btnPdfAts.textContent = t("btnPdfAtsLoading");

      let stage = null;
      try {
        downloadAtsTxt();
        const root = buildAtsRoot();
        stage = openStage(root, 720, t("btnPdfAtsLoading"));
        await exportElementToPdf(root, t("pdfFilenameAts"));
      } catch (err) {
        console.error(err);
        alert(
          (currentLang === "es"
            ? "Se descargo el TXT ATS. El PDF ATS no se pudo generar."
            : "ATS TXT was downloaded. ATS PDF could not be generated.") +
            (err?.message ? "\n\n" + err.message : "")
        );
      } finally {
        closeStage(stage);
        btnPdfAts.disabled = false;
        btnPdfAts.textContent = originalLabel;
      }
    });
  }
})();
