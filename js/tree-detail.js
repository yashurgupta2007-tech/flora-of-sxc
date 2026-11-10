
document.addEventListener("DOMContentLoaded", async () => {
    const content = document.getElementById("tree-content");

    if (!content) {
        console.error("Tree detail: #tree-content not found.");
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (!id) {
        renderNotFound();
        return;
    }

    try {
        const tree = await fetchTreeById(id);

        if (!tree || tree.is_active === false) {
            renderNotFound();
            return;
        }

        const gallery = await fetchTreeGallery(tree);
        renderTree(tree, gallery);
    } catch (error) {
        console.error("Could not load tree:", error);
        renderNotFound();
    }

    function renderNotFound() {
        content.innerHTML = `
            <div class="not-found" style="padding-top:160px;">
                <div class="big-icon">
                    <i class="fa-solid fa-seedling"></i>
                </div>
                <h2>Plant Not Found</h2>
                <p style="color:var(--ink-600);max-width:420px;">
                    This QR code or link might be outdated, or the plant
                    entry was removed. Browse the full directory instead.
                </p>
                <a href="trees.html" class="btn btn-primary"
                   style="margin-top:20px;">
                    <i class="fa-solid fa-arrow-left"></i>
                    Back to Directory
                </a>
            </div>
        `;
    }

    function hasValue(value) {
        return value !== null &&
            value !== undefined &&
            String(value).trim() !== "";
    }

    function row(label, value) {
        if (!hasValue(value)) return "";

        const displayValue = label === "Scientific Name"
            ? `<i>${escapeHTML(String(value))}</i>`
            : escapeHTML(String(value));

        return `
            <li>
                <span class="label">${escapeHTML(label)}</span>
                <span class="value">${displayValue}</span>
            </li>
        `;
    }

    function section(title, icon, value) {
        if (!hasValue(value)) return "";

        return `
            <div class="detail-card">
                <h3>
                    <i class="fa-solid ${icon}"></i>
                    ${escapeHTML(title)}
                </h3>
                <p>${escapeHTML(String(value))}</p>
            </div>
        `;
    }

    async function fetchTreeGallery(tree) {
        const { data, error } = await supabaseClient
            .from("tree_images")
            .select("image_url, caption, display_order")
            .eq("tree_id", tree.id)
            .order("display_order", { ascending: true });

        if (error) {
            console.error("Could not load tree gallery:", error);
        }

        if (!error && Array.isArray(data) && data.length > 0) {
            const images = data.filter(image =>
                hasValue(image.image_url)
            );

            if (images.length > 0) return images;
        }

        // Keep the existing main image as a fallback.
        if (hasValue(tree.image_url)) {
            return [{
                image_url: tree.image_url,
                caption: "",
                display_order: 1
            }];
        }

        return [];
    }

    function renderTree(tree, gallery) {
        document.title =
            `${tree.common_name || "Plant"} | Flora of SXC`;

        const canonicalUrl =
            window.location.origin +
            window.location.pathname +
            "?id=" + encodeURIComponent(tree.id);

        const zoneName = tree.campus_zones?.name || "";

        const galleryHTML = gallery.length
            ? `
                <div class="tree-gallery" id="tree-gallery">
                    <div class="tree-gallery-stage">
                        <img
                            id="gallery-main-image"
                            alt="${escapeHTML(tree.common_name || "Plant")}"
                            decoding="async"
                        >

                        <button
                            type="button"
                            class="gallery-arrow gallery-prev"
                            id="gallery-prev"
                            aria-label="Previous photo"
                            ${gallery.length < 2 ? "hidden" : ""}
                        >
                            <i class="fa-solid fa-chevron-left"></i>
                        </button>

                        <button
                            type="button"
                            class="gallery-arrow gallery-next"
                            id="gallery-next"
                            aria-label="Next photo"
                            ${gallery.length < 2 ? "hidden" : ""}
                        >
                            <i class="fa-solid fa-chevron-right"></i>
                        </button>
                    </div>

                    <p
                        class="gallery-caption"
                        id="gallery-caption"
                        aria-live="polite"
                    >${escapeHTML(gallery[0].caption || "")}</p>

                    <div
                        class="gallery-counter"
                        id="gallery-counter"
                        ${gallery.length < 2 ? "hidden" : ""}
                    >1 / ${gallery.length}</div>
                </div>
            `
            : `
                <div class="tree-gallery tree-gallery-empty">
                    <i class="fa-solid fa-leaf"></i>
                    <p>No photographs available yet.</p>
                </div>
            `;

        content.innerHTML = `

<div class="plant-profile-heading">
    <h1>${escapeHTML(tree.common_name || "Unnamed Plant")}</h1>
    ${hasValue(tree.botanical_name)
                ? `<p class="plant-profile-scientific"><i>${escapeHTML(tree.botanical_name)}</i></p>`
                : ""}
</div>

${galleryHTML}

<div class="detail-grid">
    <div class="reveal">
        ${section("Reason for Common Name", "fa-book-open", tree.reason_common_name)}
        ${section("Scientific Name & Meaning", "fa-dna", tree.scientific_name_meaning)}
        ${section("Morphology", "fa-leaf", tree.morphology)}
        ${section("Reason Behind Morphology", "fa-magnifying-glass", tree.morphology_reason)}
        ${section("Traditional Uses", "fa-hand-holding-heart", tree.traditional_uses)}
        ${section("Interesting Facts", "fa-lightbulb", tree.interesting_facts)}
        ${section("Story Behind the Tree", "fa-book", tree.story)}
    </div>

    <div class="reveal">
        <div class="detail-card">
            <h3><i class="fa-solid fa-seedling"></i> Plant Information</h3>
            <ul class="info-list">
                ${row("Common Name", tree.common_name)}
                ${row("Scientific Name", tree.botanical_name)}
                ${row("Plant Type", tree.plant_type)}
                ${row("Campus Location", zoneName)}
            </ul>
        </div>

        <div class="detail-card qr-box">
            <h3 style="justify-content:center;">
                <i class="fa-solid fa-qrcode"></i> Scan This Plant
            </h3>
            <div id="qrcode-container"></div>
            <p class="hint">
                Scanning this code opens the permanent Flora of SXC profile for this plant.
            </p>
            <button type="button" class="btn btn-dark" id="download-qr-btn"
                    style="width:100%;justify-content:center;">
                <i class="fa-solid fa-download"></i> Download QR Code
            </button>
        </div>
    </div>
</div>

        `;

        setupGallery(gallery, tree);
        setupQRCode(tree, canonicalUrl);
    }

    function setupGallery(gallery, tree) {
        if (!gallery.length) return;

        const image = document.getElementById("gallery-main-image");
        const caption = document.getElementById("gallery-caption");
        const counter = document.getElementById("gallery-counter");
        const previous = document.getElementById("gallery-prev");
        const next = document.getElementById("gallery-next");
        const stage = document.querySelector(".tree-gallery-stage");

        let currentIndex = 0;
        let touchStartX = 0;
        let loadRequest = 0;

        function showImage(index) {
            currentIndex =
                (index + gallery.length) % gallery.length;

            const photo = gallery[currentIndex];
            const request = ++loadRequest;

            caption.hidden = true;
            stage.classList.add("is-loading");
            image.style.visibility = "hidden";

            counter.textContent =`${currentIndex + 1} / ${gallery.length}`;
            
            const preload = new Image();

            preload.onload = () => {
                if (request !== loadRequest) return;

                image.src = photo.image_url;
                image.alt = `${tree.common_name || "Plant"} photograph ${currentIndex + 1}`;
                image.style.visibility = "visible";
                stage.classList.remove("is-loading");
                caption.textContent = photo.caption || "";
                caption.hidden = !hasValue(photo.caption);
            };

            preload.onerror = () => {
                if (request !== loadRequest) return;
                stage.classList.remove("is-loading");
                caption.hidden = true;
                console.error("Could not load gallery image: ", photo.image_url);
            };

            preload.src = photo.image_url;            
        }

        if (gallery.length < 2) {
            previous.hidden = true;
            next.hidden = true;
            counter.hidden = true;
        } else {
            previous.addEventListener("click", () => {
                showImage(currentIndex - 1);
            });

            next.addEventListener("click", () => {
                showImage(currentIndex + 1);
            });

            stage.addEventListener("touchstart", event => {
                touchStartX = event.changedTouches[0].screenX;
            }, { passive: true });

            stage.addEventListener("touchend", event => {
                const touchEndX = event.changedTouches[0].screenX;
                const difference = touchEndX - touchStartX;

                if (Math.abs(difference) < 45) return;

                showImage(
                    difference < 0
                        ? currentIndex + 1
                        : currentIndex - 1
                );
            }, { passive: true });

            stage.tabIndex = 0;
            stage.setAttribute("aria-label", "Plant photo gallery");

            stage.addEventListener("keydown", event => {
                if (event.key === "ArrowLeft") {
                    showImage(currentIndex - 1);
                }

                if (event.key === "ArrowRight") {
                    showImage(currentIndex + 1);
                }
            });
        }
        showImage(0);
    }

    function setupQRCode(tree, canonicalUrl) {
        const qrContainer =
            document.getElementById("qrcode-container");

        if (qrContainer && window.QRCode) {
            new QRCode(qrContainer, {
                text: canonicalUrl,
                width: 180,
                height: 180,
                colorDark: "#0f3d24",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
        } else {
            console.warn("QR Code library is not loaded.");
        }

        const downloadBtn =
            document.getElementById("download-qr-btn");

        if (downloadBtn) {
            downloadBtn.addEventListener("click", () => {
                const canvas =
                    qrContainer?.querySelector("canvas");

                if (!canvas) return;

                const safeName = (tree.common_name || "plant")
                    .replace(/[^a-z0-9]+/gi, "-")
                    .replace(/^-|-$/g, "");

                const link = document.createElement("a");
                link.download = `QR-${safeName}.png`;
                link.href = canvas.toDataURL("image/png");
                link.click();
            });
        }
    }
});
