const loadJsPDF = async () => {
    const { default: jsPDF }     = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    if (!jsPDF.prototype.autoTable) {
        jsPDF.prototype.autoTable = function (...args) {
            return autoTable(this, ...args);
        };
    }
    return jsPDF;
};

const MOIS  = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const JOURS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];

const addHeader = (doc, title, subtitle = '') => {
    const W = doc.internal.pageSize.getWidth();
    doc.setFillColor(52, 152, 219);
    doc.rect(0, 0, W, 25, 'F');
    doc.setFontSize(14); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
    doc.text('EduSchedule Pro', 14, 11);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text('Système de Gestion Scolaire', 14, 18);
    const now = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.setFontSize(8);
    doc.text(`Imprimé le ${now}`, W - 14, 18, { align: 'right' });
    doc.setFontSize(16); doc.setTextColor(44, 62, 80); doc.setFont('helvetica', 'bold');
    doc.text(title, W / 2, 38, { align: 'center' });
    if (subtitle) {
        doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 100, 100);
        doc.text(subtitle, W / 2, 45, { align: 'center' });
        return 52;
    }
    return 45;
};

const addFooter = (doc) => {
    const W = doc.internal.pageSize.getWidth();
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8); doc.setTextColor(150); doc.setFont('helvetica', 'normal');
        doc.text(
            `EduSchedule Pro | Page ${i}/${pageCount} | ${new Date().toLocaleDateString('fr-FR')}`,
            W / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' }
        );
    }
};

// ── 1. EMPLOI DU TEMPS ────────────────────────────────────────────────────────
export const exportEmploiTemps = async (creneaux, classeLibelle, semaine) => {
    const jsPDF = await loadJsPDF();
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();

    doc.setFillColor(52, 152, 219);
    doc.rect(0, 0, W, 20, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(14); doc.setFont('helvetica', 'bold');
    doc.text('EduSchedule Pro — Emploi du Temps', W / 2, 13, { align: 'center' });
    doc.setTextColor(0, 0, 0); doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text(`Classe : ${classeLibelle}`, 14, 30);
    doc.setFont('helvetica', 'normal');
    if (semaine) doc.text(`Semaine du : ${semaine}`, 14, 37);
    doc.text(`Généré le : ${new Date().toLocaleDateString('fr-FR')}`, W - 14, 37, { align: 'right' });

    const heures = ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'];
    const rows = heures.map(heure => {
        const row = [heure];
        JOURS.forEach(jour => {
            const creneau = creneaux.find(c => {
                const debutH = parseInt(c.heure_debut?.substring(0, 2));
                const finH   = parseInt(c.heure_fin?.substring(0, 2));
                const heureH = parseInt(heure.substring(0, 2));
                return c.jour === jour && heureH >= debutH && heureH < finH;
            });
            if (creneau) {
                const isFirst = parseInt(creneau.heure_debut?.substring(0, 2)) === parseInt(heure.substring(0, 2));
                row.push(isFirst ? `${creneau.matiere}\n${creneau.enseignant}\n${creneau.salle}` : '');
            } else {
                row.push('');
            }
        });
        return row;
    });

    doc.autoTable({
        startY: 42,
        head: [['Heure', ...JOURS]],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [52, 152, 219], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 7, cellPadding: 2 },
        columnStyles: { 0: { cellWidth: 18, fontStyle: 'bold', fillColor: [240, 248, 255] } },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index > 0 && data.cell.text[0]) {
                data.cell.styles.fillColor = [214, 234, 248];
                data.cell.styles.fontStyle = 'bold';
            }
        }
    });

    addFooter(doc);
    doc.save(`emploi_du_temps_${classeLibelle.replace(/\s/g, '_')}.pdf`);
};

// ── 2. CAHIER DE TEXTE ────────────────────────────────────────────────────────
export const exportCahier = async (cahier) => {
    const jsPDF = await loadJsPDF();
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const parseContenu = (contenu_json) => {
        try {
            const p = typeof contenu_json === 'string' ? JSON.parse(contenu_json) : contenu_json;
            return { points: p?.points || '', travaux: p?.travaux || '', observations: p?.observations || '' };
        } catch {
            return { points: contenu_json || '', travaux: '', observations: '' };
        }
    };
    const contenu = parseContenu(cahier.contenu_json);

    let y = addHeader(doc, 'Cahier de Texte Numérique', cahier.titre_cours || 'Sans titre');

    doc.autoTable({
        startY: y,
        body: [
            ['Classe',      cahier.classe   || '—'],
            ['Matière',     cahier.matiere  || '—'],
            ['Enseignant',  `${cahier.enseignant_nom || ''} ${cahier.enseignant_prenom || ''}`.trim() || '—'],
            ['Date',        new Date(cahier.date_creation).toLocaleDateString('fr-FR')],
            ['Heure début', cahier.heure_debut?.substring(0, 5) || '—'],
            ['Heure fin',   cahier.heure_fin_reelle || cahier.heure_fin?.substring(0, 5) || '—'],
            ['Statut',      cahier.statut === 'cloture' ? '🔒 Clôturé' : cahier.statut || '—'],
        ],
        theme: 'plain',
        bodyStyles: { fontSize: 10, cellPadding: 3 },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 45, fillColor: [234, 242, 248] },
            1: { cellWidth: 140 },
        }
    });
    y = doc.lastAutoTable.finalY + 8;

    const addSection = (label, content, fillColor, textColor) => {
        if (!content) return;
        doc.setFillColor(...fillColor);
        doc.rect(14, y, 182, 8, 'F');
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...textColor);
        doc.text(label, 18, y + 5.5);
        y += 10;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(0, 0, 0);
        const lines = doc.splitTextToSize(content, 178);
        doc.text(lines, 14, y);
        y += lines.length * 6 + 8;
    };

    addSection('Points vus dans le cours', contenu.points || 'Aucun contenu renseigné', [234, 242, 248], [41, 128, 185]);
    addSection('Travaux demandés',         contenu.travaux,      [254, 249, 231], [230, 126, 34]);
    addSection('Observations',             contenu.observations, [253, 237, 237], [231, 76, 60]);

    if (cahier.niveau_avancement) {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(0);
        doc.text("Niveau d'avancement :", 14, y);
        doc.setFont('helvetica', 'normal');
        doc.text(String(cahier.niveau_avancement), 70, y);
        y += 8;
    }

    y = Math.max(y + 10, 225);
    doc.setDrawColor(150); doc.setLineWidth(0.3); doc.line(14, y, 196, y);
    y += 6;
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(0);
    doc.text('Signature Délégué',    50,  y, { align: 'center' });
    doc.text('Signature Enseignant', 160, y, { align: 'center' });
    y += 4;
    doc.setDrawColor(100);
    doc.rect(14,  y, 72, 25);
    doc.rect(124, y, 72, 25);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    if (cahier.signe_delegue    > 0) { doc.setTextColor(46, 204, 113); doc.text('✓ Signé', 50,  y + 14, { align: 'center' }); }
    if (cahier.signe_enseignant > 0) { doc.setTextColor(46, 204, 113); doc.text('✓ Signé', 160, y + 14, { align: 'center' }); }

    addFooter(doc);
    doc.save(`cahier_texte_${(cahier.titre_cours || 'cahier').replace(/\s/g, '_')}.pdf`);
};

// ── 3. FICHE DE VACATION ──────────────────────────────────────────────────────
export const exportVacation = async (vacation) => {
    const jsPDF = await loadJsPDF();
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    const moisLabel = MOIS[(vacation.mois || 1) - 1];

    let y = addHeader(doc, 'Fiche de Vacation Mensuelle', `${vacation.nom} ${vacation.prenom} — ${moisLabel} ${vacation.annee}`);

    doc.setFillColor(248, 249, 250); doc.setDrawColor(52, 152, 219);
    doc.rect(14, y, W - 28, 30, 'FD');
    const infoEns = [
        ['Enseignant :',   `${vacation.nom} ${vacation.prenom}`],
        ['Taux horaire :', `${parseFloat(vacation.taux_horaire || 0).toLocaleString('fr-FR')} FCFA/heure`],
        ['Période :',      `${moisLabel} ${vacation.annee}`],
        ['Nb séances :',   `${vacation.lignes?.length || vacation.nb_seances || 0} séance(s)`],
    ];
    infoEns.forEach((info, i) => {
        const col = i % 2 === 0 ? 18 : W / 2 + 4;
        const row = Math.floor(i / 2);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(44, 62, 80);
        doc.text(info[0], col, y + 10 + row * 10);
        doc.setFont('helvetica', 'normal');
        doc.text(info[1], col + 38, y + 10 + row * 10);
    });
    y += 36;

    doc.setFillColor(52, 152, 219); doc.rect(14, y, W - 28, 8, 'F');
    doc.setFontSize(10); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
    doc.text('DÉTAIL DES SÉANCES RÉALISÉES', 18, y + 5.5);
    y += 10;

    if (vacation.lignes && vacation.lignes.length > 0) {
        doc.autoTable({
            head: [['Matière', 'Classe', 'Durée (h)', 'Taux (FCFA/h)', 'Montant (FCFA)']],
            body: vacation.lignes.map(l => [
                l.matiere || '—',
                l.classe  || '—',
                parseFloat(l.duree_heures || 0).toFixed(2),
                parseFloat(l.taux    || 0).toLocaleString('fr-FR'),
                parseFloat(l.montant || 0).toLocaleString('fr-FR'),
            ]),
            foot: [[
                { content: 'TOTAL', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
                { content: vacation.lignes.reduce((s, l) => s + parseFloat(l.duree_heures || 0), 0).toFixed(2), styles: { fontStyle: 'bold' } },
                '',
                { content: parseFloat(vacation.montant_brut || 0).toLocaleString('fr-FR'), styles: { fontStyle: 'bold' } },
            ]],
            startY: y,
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [52, 152, 219], textColor: 255, fontStyle: 'bold' },
            footStyles: { fillColor: [240, 240, 240], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [248, 249, 250] },
            columnStyles: { 2: { halign: 'center' }, 3: { halign: 'right' }, 4: { halign: 'right', fontStyle: 'bold' } },
        });
        y = doc.lastAutoTable.finalY + 8;
    } else {
        doc.setFontSize(9); doc.setTextColor(150); doc.text('Aucune séance enregistrée', 18, y + 8);
        y += 16;
    }

    doc.setFillColor(52, 152, 219); doc.rect(14, y, W - 28, 8, 'F');
    doc.setFontSize(10); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
    doc.text('RÉCAPITULATIF FINANCIER', 18, y + 5.5);
    y += 12;

    const montantRetenues = parseFloat(vacation.montant_brut || 0) - parseFloat(vacation.montant_net || 0);
    [
        ['Montant brut :',        `${parseFloat(vacation.montant_brut || 0).toLocaleString('fr-FR')} FCFA`, false],
        ['Retenues :',            `${montantRetenues.toLocaleString('fr-FR')} FCFA`,                        false],
        ['Montant net à payer :', `${parseFloat(vacation.montant_net  || 0).toLocaleString('fr-FR')} FCFA`, true],
    ].forEach(([label, value, isLast]) => {
        doc.setFillColor(...(isLast ? [46, 204, 113] : [248, 249, 250]));
        doc.rect(14, y, W - 28, 10, 'F');
        doc.setTextColor(...(isLast ? [255, 255, 255] : [44, 62, 80]));
        doc.setFont('helvetica', isLast ? 'bold' : 'normal'); doc.setFontSize(10);
        doc.text(label, 18, y + 7);
        doc.text(value, W - 18, y + 7, { align: 'right' });
        y += 12;
    });
    y += 6;

    doc.setFillColor(52, 152, 219); doc.rect(14, y, W - 28, 8, 'F');
    doc.setFontSize(10); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
    doc.text('VISAS ET SIGNATURES', 18, y + 5.5);
    y += 12;

    const sigW = (W - 42) / 3;
    [
        { label: 'Signature Enseignant', valide: true },
        { label: 'Visa Surveillant',     valide: ['validee_surveillant', 'approuvee_comptable'].includes(vacation.statut) },
        { label: 'Validation Comptable', valide: vacation.statut === 'approuvee_comptable' },
    ].forEach((box, i) => {
        const x = 14 + i * (sigW + 7);
        doc.setDrawColor(52, 152, 219); doc.setFillColor(248, 249, 250);
        doc.rect(x, y, sigW, 35, 'FD');
        doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(44, 62, 80);
        doc.text(box.label, x + sigW / 2, y + 7, { align: 'center' });
        if (box.valide) {
            doc.setFontSize(16); doc.setTextColor(46, 204, 113);
            doc.text('✓', x + sigW / 2, y + 24, { align: 'center' });
            doc.setFontSize(7); doc.text('Validé', x + sigW / 2, y + 30, { align: 'center' });
        } else {
            doc.setFontSize(7); doc.setFont('helvetica', 'italic'); doc.setTextColor(150);
            doc.text('En attente', x + sigW / 2, y + 22, { align: 'center' });
        }
    });
    y += 43;

    const statutMap = {
        generee:             { color: [241, 196, 15],  label: 'FICHE GÉNÉRÉE — EN ATTENTE DE VALIDATION' },
        validee_surveillant: { color: [52, 152, 219],  label: 'VALIDÉE PAR LE SURVEILLANT — EN ATTENTE COMPTABLE' },
        approuvee_comptable: { color: [46, 204, 113],  label: 'APPROUVÉE — BON DE PAIEMENT ÉMIS' },
    };
    const s = statutMap[vacation.statut] || { color: [149, 165, 166], label: vacation.statut };
    doc.setFillColor(...s.color); doc.rect(14, y, W - 28, 12, 'F');
    doc.setFontSize(9); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
    doc.text(s.label, W / 2, y + 8, { align: 'center' });

    addFooter(doc);
    doc.save(`vacation_${vacation.nom}_${vacation.prenom}_${moisLabel}_${vacation.annee}.pdf`);
};