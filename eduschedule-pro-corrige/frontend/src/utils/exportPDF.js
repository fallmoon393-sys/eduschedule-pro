// Utilitaire d'export PDF via jsPDF
// Usage : import { exportEmploiTemps, exportCahier, exportVacation } from '../utils/exportPDF';

const loadJsPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    // Patch: attach autoTable to prototype if not already there
    if (!jsPDF.prototype.autoTable) {
        jsPDF.prototype.autoTable = function(...args) {
            return autoTable(this, ...args);
        };
    }
    return jsPDF;
};

const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const JOURS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];

// ============================================================
// 1. EXPORT EMPLOI DU TEMPS
// ============================================================
export const exportEmploiTemps = async (creneaux, classeLibelle, semaine) => {
    const jsPDF = await loadJsPDF();
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // En-tête
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, 297, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('EduSchedule Pro — Emploi du Temps', 148, 13, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Classe : ${classeLibelle}`, 14, 30);
    doc.setFont('helvetica', 'normal');
    doc.text(`Généré le : ${new Date().toLocaleDateString('fr-FR')}`, 14, 37);

    // Grille horaire
    const heures = ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00'];
    
    const headers = ['Heure', ...JOURS];
    const rows = heures.map(heure => {
        const row = [heure];
        JOURS.forEach(jour => {
            const creneau = creneaux.find(c => {
                const debutH = parseInt(c.heure_debut?.substring(0, 2));
                const finH = parseInt(c.heure_fin?.substring(0, 2));
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
        head: [headers],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 7, cellPadding: 2 },
        columnStyles: { 0: { cellWidth: 18, fontStyle: 'bold' } },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index > 0 && data.cell.text[0]) {
                data.cell.styles.fillColor = [214, 234, 248];
                data.cell.styles.fontStyle = 'bold';
            }
        }
    });

    // Pied de page
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`EduSchedule Pro | Page ${i}/${pageCount} | ${new Date().toLocaleDateString('fr-FR')}`, 148, 205, { align: 'center' });
    }

    doc.save(`emploi_du_temps_${classeLibelle.replace(/\s/g, '_')}.pdf`);
};

// ============================================================
// 2. EXPORT CAHIER DE TEXTE
// ============================================================
export const exportCahier = async (cahier) => {
    const jsPDF = await loadJsPDF();
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const parseContenu = (contenu_json) => {
        try {
            const p = typeof contenu_json === 'string' ? JSON.parse(contenu_json) : contenu_json;
            return { points: p?.points || '', travaux: p?.travaux || '' };
        } catch { return { points: contenu_json || '', travaux: '' }; }
    };

    const contenu = parseContenu(cahier.contenu_json);

    // En-tête
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, 210, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('EduSchedule Pro', 105, 10, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Cahier de Texte Numérique', 105, 18, { align: 'center' });

    // Titre
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(cahier.titre_cours || 'Sans titre', 105, 35, { align: 'center' });

    // Ligne séparatrice
    doc.setDrawColor(41, 128, 185);
    doc.setLineWidth(0.5);
    doc.line(14, 40, 196, 40);

    // Informations principales
    let y = 48;
    const champs = [
        ['Classe',       cahier.classe || '—'],
        ['Matière',      cahier.matiere || '—'],
        ['Enseignant',   `${cahier.enseignant_nom || ''} ${cahier.enseignant_prenom || ''}`],
        ['Date',         new Date(cahier.date_creation).toLocaleDateString('fr-FR')],
        ['Heure début',  cahier.heure_debut?.substring(0, 5) || '—'],
        ['Heure fin',    cahier.heure_fin_reelle || cahier.heure_fin?.substring(0, 5) || '—'],
        ['Statut',       cahier.statut === 'cloture' ? 'Clôturé ✓' : cahier.statut],
    ];

    doc.autoTable({
        startY: y,
        body: champs,
        theme: 'plain',
        bodyStyles: { fontSize: 10, cellPadding: 3 },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 45, fillColor: [234, 242, 248] },
            1: { cellWidth: 140 }
        }
    });

    y = doc.lastAutoTable.finalY + 8;

    // Points du cours
    doc.setFillColor(234, 242, 248);
    doc.rect(14, y, 182, 7, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(41, 128, 185);
    doc.text('Points vus dans le cours', 18, y + 5);

    y += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    const pointsLines = doc.splitTextToSize(contenu.points || 'Aucun contenu renseigné', 180);
    doc.text(pointsLines, 14, y);
    y += pointsLines.length * 6 + 8;

    // Travaux demandés
    if (contenu.travaux) {
        doc.setFillColor(254, 249, 231);
        doc.rect(14, y, 182, 7, 'F');
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(230, 126, 34);
        doc.text('Travaux demandés', 18, y + 5);
        y += 10;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        const travauxLines = doc.splitTextToSize(contenu.travaux, 180);
        doc.text(travauxLines, 14, y);
        y += travauxLines.length * 6 + 8;
    }

    // Niveau d'avancement
    if (cahier.niveau_avancement) {
        doc.setFont('helvetica', 'bold');
        doc.text(`Niveau d'avancement : `, 14, y);
        doc.setFont('helvetica', 'normal');
        doc.text(cahier.niveau_avancement, 72, y);
        y += 8;
    }

    // Observations
    if (cahier.observations) {
        doc.setFillColor(253, 237, 237);
        doc.rect(14, y, 182, 7, 'F');
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(231, 76, 60);
        doc.text('Observations', 18, y + 5);
        y += 10;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        const obsLines = doc.splitTextToSize(cahier.observations, 180);
        doc.text(obsLines, 14, y);
        y += obsLines.length * 6 + 8;
    }

    // Zone signatures
    y = Math.max(y, 220);
    doc.setDrawColor(150);
    doc.setLineWidth(0.3);
    doc.line(14, y, 196, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Signature Délégué', 50, y, { align: 'center' });
    doc.text('Signature Enseignant', 160, y, { align: 'center' });
    y += 4;

    // Cadres de signature
    doc.setDrawColor(100);
    doc.rect(14, y, 72, 25);
    doc.rect(124, y, 72, 25);

    if (cahier.signe_delegue > 0) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(46, 204, 113);
        doc.text('✓ Signé', 50, y + 14, { align: 'center' });
    }
    if (cahier.signe_enseignant > 0) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(46, 204, 113);
        doc.text('✓ Signé', 160, y + 14, { align: 'center' });
    }

    // Pied de page
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`EduSchedule Pro | Cahier de texte | ${new Date().toLocaleDateString('fr-FR')}`, 105, 290, { align: 'center' });

    doc.save(`cahier_texte_${(cahier.titre_cours || 'cahier').replace(/\s/g, '_')}.pdf`);
};

// ============================================================
// 3. EXPORT FICHE DE VACATION
// ============================================================
export const exportVacation = async (vacation) => {
    const jsPDF = await loadJsPDF();
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // En-tête
    doc.setFillColor(44, 62, 80);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('EduSchedule Pro', 105, 12, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Fiche de Vacation Mensuelle', 105, 22, { align: 'center' });

    // Informations enseignant
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(`${vacation.nom} ${vacation.prenom}`, 105, 42, { align: 'center' });
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Période : ${MOIS[vacation.mois - 1]} ${vacation.annee}`, 105, 50, { align: 'center' });

    doc.setDrawColor(44, 62, 80);
    doc.line(14, 55, 196, 55);

    // Informations générales
    doc.autoTable({
        startY: 58,
        body: [
            ['Taux horaire',   `${parseFloat(vacation.taux_horaire || 0).toLocaleString('fr-FR')} FCFA/h`],
            ['Nombre de séances', vacation.lignes?.length || vacation.nb_seances || 0],
            ['Montant brut',   `${parseFloat(vacation.montant_brut || 0).toLocaleString('fr-FR')} FCFA`],
            ['Retenues',       `${(parseFloat(vacation.montant_brut || 0) - parseFloat(vacation.montant_net || 0)).toLocaleString('fr-FR')} FCFA`],
            ['Montant net',    `${parseFloat(vacation.montant_net || 0).toLocaleString('fr-FR')} FCFA`],
        ],
        theme: 'plain',
        bodyStyles: { fontSize: 10, cellPadding: 3 },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 60, fillColor: [236, 240, 241] },
            1: { cellWidth: 100 }
        }
    });

    // Tableau détail séances
    if (vacation.lignes && vacation.lignes.length > 0) {
        const y = doc.lastAutoTable.finalY + 10;
        
        doc.setFillColor(44, 62, 80);
        doc.rect(14, y, 182, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Détail des séances réalisées', 105, y + 5.5, { align: 'center' });

        doc.autoTable({
            startY: y + 8,
            head: [['Matière', 'Classe', 'Durée (h)', 'Taux (FCFA/h)', 'Montant (FCFA)']],
            body: vacation.lignes.map(l => [
                l.matiere || '—',
                l.classe || '—',
                parseFloat(l.duree_heures || 0).toFixed(1),
                parseFloat(l.taux || 0).toLocaleString('fr-FR'),
                parseFloat(l.montant || 0).toLocaleString('fr-FR')
            ]),
            foot: [[
                { content: 'TOTAL', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' } },
                vacation.lignes.reduce((s, l) => s + parseFloat(l.duree_heures || 0), 0).toFixed(1),
                '',
                parseFloat(vacation.montant_brut || 0).toLocaleString('fr-FR')
            ]],
            theme: 'striped',
            headStyles: { fillColor: [44, 62, 80], textColor: 255, fontStyle: 'bold', fontSize: 9 },
            footStyles: { fillColor: [236, 240, 241], fontStyle: 'bold', fontSize: 9 },
            bodyStyles: { fontSize: 9 },
        });
    }

    // Zone validation
    const yValid = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 200;
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Validations', 14, yValid);
    doc.setLineWidth(0.3);
    doc.line(14, yValid + 2, 196, yValid + 2);

    // Statut workflow
    const statuts = [
        { label: 'Généré', done: true },
        { label: 'Validé (Surveillant)', done: ['validee_surveillant', 'approuvee_comptable'].includes(vacation.statut) },
        { label: 'Approuvé (Comptable)', done: vacation.statut === 'approuvee_comptable' },
    ];

    statuts.forEach((s, i) => {
        const x = 14 + i * 62;
        doc.setFillColor(s.done ? 46 : 200, s.done ? 204 : 200, s.done ? 113 : 200);
        doc.circle(x + 10, yValid + 15, 5, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', s.done ? 'bold' : 'normal');
        doc.setTextColor(s.done ? 46 : 150, s.done ? 204 : 150, s.done ? 113 : 150);
        doc.text(s.label, x + 10, yValid + 25, { align: 'center' });
    });

    // Cases signatures
    const ySig = yValid + 35;
    doc.setTextColor(0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');

    ['Enseignant', 'Surveillant', 'Comptable'].forEach((role, i) => {
        const x = 14 + i * 62;
        doc.text(`Signature ${role}`, x + 25, ySig, { align: 'center' });
        doc.rect(x, ySig + 2, 50, 20);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('Nom & Date', x + 25, ySig + 18, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
    });

    // Pied de page
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.setFont('helvetica', 'normal');
    doc.text(`EduSchedule Pro | Fiche de Vacation | Généré le ${new Date().toLocaleDateString('fr-FR')}`, 105, 290, { align: 'center' });

    doc.save(`vacation_${vacation.nom}_${vacation.prenom}_${MOIS[vacation.mois - 1]}_${vacation.annee}.pdf`);
};