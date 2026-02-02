// pdf.worker.js

// 1. Import library jsPDF dari CDN
importScripts("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");

self.onmessage = async (e) => {
    try {
        const { formData, capturedPhotos, allPhotoPoints } = e.data;
        
        // Akses jsPDF dari global object self.jspdf
        const { jsPDF } = self.jspdf; 
        const doc = new jsPDF();
        
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 15;
        let yPos = 20;

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

        addHeader("DATA PROYEK");

        const addRow = (label, value) => {
            doc.setFont("helvetica", "bold");
            doc.text(label, margin, yPos);
            doc.setFont("helvetica", "normal");
            doc.text(": " + (value || "-"), margin + 50, yPos);
            yPos += 8;
        };

        addRow("Cabang", formData.cabang);
        addRow("Kode Toko", formData.kodeToko);
        addRow("Nama Toko", formData.namaToko);
        addRow("Kontraktor Sipil", formData.kontraktorSipil);
        addRow("Kontraktor ME", formData.kontraktorMe);
        yPos += 5;
        addRow("SPK Awal", formData.spkAwal);
        addRow("SPK Akhir", formData.spkAkhir);
        addRow("Tanggal GO", formData.tanggalGo);
        addRow("Tanggal ST", formData.tanggalSt);
        addRow("Tgl Ambil Foto", formData.tanggalAmbilFoto);

        const sortedIds = Object.keys(capturedPhotos).map(Number).sort((a, b) => a - b);
        
        const photoWidth = 80;
        const photoHeight = 60; 
        const gapX = 10;
        const gapY = 25;
        
        let count = 0;
        
        if (sortedIds.length > 0) {
            doc.addPage();
            addHeader("DOKUMENTASI FOTO");
        }

        for (let i = 0; i < sortedIds.length; i++) {
            const id = sortedIds[i];
            const photo = capturedPhotos[id];
            
            if (count > 0 && count % 4 === 0) {
                doc.addPage();
                addHeader("DOKUMENTASI FOTO");
                yPos = 35; 
            }

            const col = count % 2; 
            const row = Math.floor((count % 4) / 2); 

            const x = margin + (col * (photoWidth + gapX));
            const y = yPos + (row * (photoHeight + gapY));

            doc.setFontSize(9);
            doc.setFont("helvetica", "bold");
            
            const pointInfo = allPhotoPoints.find(p => p.id === id);
            const label = pointInfo ? pointInfo.label : `Foto #${id}`;
            
            const splitTitle = doc.splitTextToSize(`${id}. ${label}`, photoWidth);
            doc.text(splitTitle, x, y - 2);

            try {
                if (photo.url && photo.url.startsWith("data:image")) {
                    doc.addImage(photo.url, "JPEG", x, y, photoWidth, photoHeight);
                } else {
                     doc.setDrawColor(200);
                     doc.setFillColor(240);
                     doc.rect(x, y, photoWidth, photoHeight, "FD");
                     
                     let statusText = "FOTO TERSIMPAN";
                     if(photo.url.includes("fototidakbisadiambil")) statusText = "TIDAK BISA DIFOTO";
                     else if(!photo.url.startsWith("http") && !photo.url.startsWith("data:")) statusText = "GAMBAR LOCAL";

                     doc.setFontSize(8);
                     doc.text(statusText, x + photoWidth/2, y + photoHeight/2, {align:"center"});
                }
            } catch (err) {
                console.error("Error add image PDF", err);
            }

            if (photo.note) {
                doc.setFontSize(8);
                doc.setTextColor(220, 38, 38); 
                doc.text(`Note: ${photo.note}`, x, y + photoHeight + 5);
                doc.setTextColor(0); 
            }

            count++;
        }

        const pdfBase64 = doc.output('datauristring');
        const pdfBlob = doc.output('blob');

        self.postMessage({ ok: true, pdfBase64, pdfBlob });

    } catch (error) {
        self.postMessage({ ok: false, error: error.message, stack: error.stack });
    }
};