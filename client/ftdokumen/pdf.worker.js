// pdf.worker.js
// Import library jsPDF dari CDN
importScripts("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");

self.onmessage = async (e) => {
    try {
        const { formData, capturedPhotos, allPhotoPoints } = e.data;

        // Init jsPDF
        const { jsPDF } = self.jspdf;
        if (!jsPDF) throw new Error("Library jsPDF gagal dimuat");

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        let yPos = 20;

        // Helper: Header Halaman
        const addHeader = (title) => {
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.text(title || "DOKUMENTASI TOKO BARU", pageWidth / 2, 15, { align: "center" });

            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");
            const namaToko = formData.namaToko || "-";
            const kodeToko = formData.kodeToko || "-";
            doc.text(`Toko: ${namaToko} (${kodeToko})`, pageWidth / 2, 22, { align: "center" });

            doc.setLineWidth(0.5);
            doc.line(margin, 25, pageWidth - margin, 25);
            yPos = 35;
        };

        // Halaman 1: Informasi Toko
        addHeader("DATA TOKO");
        doc.setFontSize(11);
        
        const info = [
            `Nomor ULOK: ${formData.nomorUlok || "-"}`,
            `Nama Toko: ${formData.namaToko || "-"}`,
            `Kode Toko: ${formData.kodeToko || "-"}`,
            `Tgl Ambil Foto: ${formData.tanggalAmbilFoto || "-"}`,
            `Alamat: ${formData.alamatToko || "-"}`
            // Tambahkan field lain sesuai kebutuhan
        ];

        info.forEach(line => {
            doc.text(line, margin, yPos);
            yPos += 7;
        });

        // Loop Foto
        let count = 0;
        
        // Urutkan titik foto berdasarkan ID
        const sortedPoints = allPhotoPoints.sort((a, b) => a.id - b.id);

        for (const p of sortedPoints) {
            // Cek apakah halaman penuh
            if (count > 0 && count % 2 === 0) {
                doc.addPage();
                addHeader(`FOTO DOKUMENTASI (Hal. ${Math.floor(count/2) + 2})`);
            }

            // Tentukan posisi Y (2 foto per halaman)
            // Foto 1: y=35, Foto 2: y=150 (estimasi)
            const isTop = count % 2 === 0;
            const currentY = isTop ? 35 : 150; 
            
            // Judul Foto
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.text(`${p.id}. ${p.label}`, margin, currentY);

            // Kotak Foto
            const photoHeight = 90; // Tinggi foto
            const photoWidth = 120; // Lebar foto (4:3 ratio approx)
            
            const photoData = capturedPhotos[p.id];

            if (photoData && photoData.url) {
                try {
                    // Validasi string gambar
                    if (photoData.url.startsWith("data:image")) {
                        doc.addImage(photoData.url, "JPEG", margin, currentY + 5, photoWidth, photoHeight);
                    } else {
                        // Placeholder jika format salah
                        doc.setDrawColor(200);
                        doc.rect(margin, currentY + 5, photoWidth, photoHeight);
                        doc.text("Format Gambar Invalid", margin + 10, currentY + 45);
                    }
                } catch (err) {
                    console.error("Gagal render foto " + p.id, err);
                    doc.rect(margin, currentY + 5, photoWidth, photoHeight);
                    doc.text("Error Render Foto", margin + 10, currentY + 45);
                }

                // Catatan Foto (jika ada)
                if (photoData.note) {
                    doc.setFont("helvetica", "italic");
                    doc.setFontSize(9);
                    doc.setTextColor(100);
                    // Wrap text agar tidak keluar batas
                    const splitNote = doc.splitTextToSize(`Note: ${photoData.note}`, pageWidth - (margin * 2));
                    doc.text(splitNote, margin, currentY + photoHeight + 10);
                    doc.setTextColor(0);
                }

            } else {
                // Foto Kosong / Belum Diambil
                doc.setDrawColor(200);
                doc.setFillColor(245);
                doc.rect(margin, currentY + 5, photoWidth, photoHeight, "FD");
                doc.setTextColor(150);
                doc.text("FOTO BELUM DIAMBIL", margin + 30, currentY + 45);
                doc.setTextColor(0);
            }

            count++;
        }

        // Output
        const pdfBase64 = doc.output("datauristring").split(",")[1]; // Ambil base64 murni
        const pdfBlob = doc.output("blob");

        self.postMessage({ ok: true, pdfBase64, pdfBlob });

    } catch (error) {
        self.postMessage({ ok: false, error: error.message });
    }
};