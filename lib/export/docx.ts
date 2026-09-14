"use client";

import type { LessonPlan } from "@/lib/types";
import { FORMAT_BY_ID } from "@/lib/formats";

/**
 * Build a Word document from a plan. `docx` is imported lazily so its ~1MB
 * never lands in the initial bundle — teachers on a 3G connection open the
 * planner, not the exporter.
 */
export async function downloadDocx(plan: LessonPlan, formatId: string) {
  const {
    Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
    Table, TableRow, TableCell, WidthType, BorderStyle,
  } = await import("docx");

  const fmt = FORMAT_BY_ID[formatId];
  const ur = fmt?.language === "ur";
  const font = ur ? "Jameel Noori Nastaleeq" : "Calibri";
  const rtl = ur;

  const P = (text: string, opts: { bold?: boolean; size?: number; spacing?: number; align?: "center" | "right" } = {}) =>
    new Paragraph({
      bidirectional: rtl,
      alignment: opts.align === "center" ? AlignmentType.CENTER : rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
      spacing: { after: opts.spacing ?? 90 },
      children: [new TextRun({ text, bold: opts.bold, size: opts.size ?? 22, font, rightToLeft: rtl })],
    });

  const H = (text: string) =>
    new Paragraph({
      bidirectional: rtl,
      alignment: rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 260, after: 110 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "D9E2E8", space: 4 } },
      children: [new TextRun({ text, bold: true, size: 24, font, color: "0A1016", rightToLeft: rtl })],
    });

  const Bullet = (text: string) =>
    new Paragraph({
      bidirectional: rtl,
      alignment: rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
      bullet: { level: 0 },
      spacing: { after: 60 },
      children: [new TextRun({ text, size: 22, font, rightToLeft: rtl })],
    });

  const blank = () => new Paragraph({ text: "", spacing: { after: 120 } });

  const kids: unknown[] = [];
  const push = (...items: unknown[]) => kids.push(...items);

  /* header */
  push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: ur ? "سبقی خاکہ" : "LESSON PLAN", bold: true, size: 30, font, rightToLeft: rtl })],
    }),
  );

  const metaRows: [string, string][] = ([
    [ur ? "سبق کا نمبر شمار" : "Lesson Plan No", plan.meta.lessonNo],
    [ur ? "تاریخِ تدریس" : "Date", plan.meta.date],
    [ur ? "جماعت" : "Class", plan.meta.grade],
    [ur ? "فریق" : "Section", plan.meta.section],
    [ur ? "مضمون" : "Subject", plan.meta.subject],
    [ur ? "دورانیۂِ تدریس" : "Duration", `${plan.meta.duration} ${ur ? "منٹ" : "min"}`],
    [ur ? "عنوان" : "Topic", plan.meta.topic],
    [ur ? "تعدادِ طلبہ" : "Class Strength", plan.meta.classStrength],
    [ur ? "اوسط عمر" : "Average Age", plan.meta.averageAge],
    [ur ? "نصاب / کتاب" : "Curriculum / Book", plan.meta.bookName],
    [ur ? "صفحہ نمبر" : "Page No(s)", plan.meta.pageNos],
    [ur ? "سبق کی بنیادی مہارت" : "Core Skill", plan.meta.coreSkill],
    [ur ? "معلم / معلمہ" : "Teacher", plan.meta.teacherName],
  ] as [string, string][]).filter(([, v]) => v && String(v).trim());

  const cell = (text: string, bold = false) =>
    new TableCell({
      margins: { top: 60, bottom: 60, left: 90, right: 90 },
      children: [new Paragraph({
        bidirectional: rtl,
        alignment: rtl ? AlignmentType.RIGHT : AlignmentType.LEFT,
        children: [new TextRun({ text, bold, size: 20, font, rightToLeft: rtl })],
      })],
    });

  const rows: unknown[] = [];
  for (let i = 0; i < metaRows.length; i += 2) {
    const a = metaRows[i];
    const b = metaRows[i + 1];
    rows.push(new TableRow({
      children: [
        cell(a[0], true), cell(a[1]),
        cell(b?.[0] ?? "", true), cell(b?.[1] ?? ""),
      ],
    }));
  }
  push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "D9E2E8" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "D9E2E8" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "D9E2E8" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "D9E2E8" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "EAF0F4" },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: "EAF0F4" },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rows: rows as any,
  }), blank());

  /* body */
  if (plan.coreConcept) { push(H(ur ? "سبق کا بنیادی تصور" : "CORE CONCEPT"), P(plan.coreConcept)); }

  push(H(ur ? "مقاصدِ تدریس" : "SPECIFIC OBJECTIVES"));
  plan.objectives.forEach((o) => push(Bullet(`[${o.bloomLevel}] ${o.text}`)));

  if (plan.successCriteria?.length) {
    push(H(ur ? "معیارِ کامیابی" : "SUCCESS CRITERIA"));
    plan.successCriteria.forEach((s) => push(Bullet(s)));
  }

  const sk = [...(plan.skillsAndAttitude?.skills ?? []), ...(plan.skillsAndAttitude?.attitudes ?? []), ...(plan.skillsAndAttitude?.psychomotor ?? [])];
  if (sk.length) { push(H(ur ? "مہارتیں / رویے" : "SKILLS / ATTITUDE")); sk.forEach((s) => push(Bullet(s))); }

  if (plan.keyVocabulary?.length) {
    push(H(ur ? "کلیدی الفاظ" : "KEY VOCABULARY"));
    plan.keyVocabulary.forEach((v) => push(Bullet(`${v.term} — ${v.definition}${v.localExample ? ` (${v.localExample})` : ""}`)));
  }

  if (plan.resources?.length) {
    push(H(ur ? "سمعی و بصری اعانات" : "TEACHING RESOURCES"));
    plan.resources.forEach((r) => push(Bullet(`${r.item}${r.purpose ? ` — ${r.purpose}` : ""}${r.noTechAlternative ? ` | ${r.noTechAlternative}` : ""}`)));
  }

  if (plan.classroomManagement?.rules?.length || plan.classroomManagement?.strategies?.length) {
    push(H(ur ? "اصول و ضوابط برائے منظم کمرۂِ جماعت" : "CLASSROOM MANAGEMENT RULES & STRATEGY"));
    plan.classroomManagement.rules?.forEach((r) => push(Bullet(r)));
    if (plan.classroomManagement.strategies?.length) {
      push(P(ur ? "حکمتِ عمل:" : "Strategy:", { bold: true }));
      plan.classroomManagement.strategies.forEach((s) => push(Bullet(s)));
    }
  }

  if (plan.methodology?.primaryMethod) {
    push(H(ur ? "طریقۂِ تدریس" : "TEACHING METHODOLOGY"));
    push(P(`${plan.methodology.primaryMethod}${plan.methodology.supportingMethods?.length ? " · " + plan.methodology.supportingMethods.join(" · ") : ""}`, { bold: true }));
    if (plan.methodology.rationale) push(P(plan.methodology.rationale));
  }

  if (plan.contentDelivery?.length) {
    push(H(ur ? "ترسیلِ مواد ( جُز / جُزو )" : "CONTENT DELIVERY"));
    plan.contentDelivery.forEach((c) => push(Bullet(c)));
  }

  push(H(ur ? "اہم اسباقی مدارج" : "PROCEDURE"));
  plan.procedure.forEach((s) => {
    push(P(`${s.title}  (${s.minutes} ${ur ? "منٹ" : "min"})`, { bold: true, size: 23, spacing: 60 }));
    push(P(`${ur ? "معلم" : "Teacher"}: ${s.teacherDoes}`));
    if (s.studentsDo) push(P(`${ur ? "طلبہ" : "Students"}: ${s.studentsDo}`));
    s.questions?.forEach((q) => push(Bullet(`${q.q}${q.expected ? `  →  ${q.expected}` : ""}`)));
    if (s.checkpoint) push(P(`${ur ? "جانچ کا مرحلہ" : "Checkpoint"}: ${s.checkpoint}`));
    push(blank());
  });

  if (plan.boardSummary?.lines?.length || plan.boardSummary?.workedExample) {
    push(H(ur ? "خلاصۂِ تختۂِ سیاہ / اعادہ" : "BOARD SUMMARY"));
    if (plan.boardSummary.heading) push(P(plan.boardSummary.heading, { bold: true, align: "center" }));
    plan.boardSummary.lines?.forEach((l) => push(P(l)));
    if (plan.boardSummary.workedExample) push(P(plan.boardSummary.workedExample));
    plan.boardSummary.keyBox?.forEach((k) => push(P(k, { bold: true })));
  }

  if (plan.differentiation?.support?.length || plan.differentiation?.extension?.length) {
    push(H(ur ? "انفرادی توجہ" : "DIFFERENTIATION"));
    if (plan.differentiation.support?.length) {
      push(P(ur ? "معاونت:" : "Support:", { bold: true }));
      plan.differentiation.support.forEach((s) => push(Bullet(s)));
    }
    if (plan.differentiation.extension?.length) {
      push(P(ur ? "توسیع:" : "Extension:", { bold: true }));
      plan.differentiation.extension.forEach((s) => push(Bullet(s)));
    }
    plan.differentiation.specialNeeds?.forEach((s) => push(Bullet(s)));
  }

  if (plan.assessmentForLearning?.length) {
    push(H(ur ? "دورانِ سبق جانچ" : "ASSESSMENT FOR LEARNING"));
    plan.assessmentForLearning.forEach((a) =>
      push(Bullet(`${a.technique}${a.whenInLesson ? ` (${a.whenInLesson})` : ""} — ${a.whatItReveals}${a.ifStudentsStruggle ? ` | ${a.ifStudentsStruggle}` : ""}`)));
  }

  if (plan.recapitulation?.questions?.length) {
    push(H(ur ? "اعادہ" : "RECAPITULATION"));
    if (plan.recapitulation.technique) push(P(plan.recapitulation.technique, { bold: true }));
    plan.recapitulation.questions.forEach((q) => push(Bullet(q)));
  }

  if (plan.evaluation?.items?.length) {
    push(H(ur ? "جانچ" : "EVALUATION"));
    plan.evaluation.items.forEach((it, i) =>
      push(Bullet(`${i + 1}. ${it.question}  (${it.marks} ${ur ? "نمبر" : "marks"})${it.expectedAnswer ? `  →  ${it.expectedAnswer}` : ""}`)));
    if (plan.evaluation.totalMarks) push(P(`${ur ? "کل" : "Total"}: ${plan.evaluation.totalMarks}`, { bold: true }));
  }

  if (plan.homework?.task) {
    push(H(ur ? "تفویض" : "HOMEWORK"));
    push(P(plan.homework.task));
    if (plan.homework.differentiatedOption) push(P(plan.homework.differentiatedOption));
    if (plan.homework.howItWillBeChecked) push(P(plan.homework.howItWillBeChecked));
  }

  push(H(ur ? "نگراں معلم / معلمہ کے تاثرات" : "SUPERVISOR FEEDBACK"), blank(), blank(), blank(),
    P(`${ur ? "دستخط" : "Supervisor signature"}: ________________________`));

  const doc = new Document({
    creator: "Sabaq AI",
    title: `${plan.meta.subject} — ${plan.meta.topic}`,
    styles: { default: { document: { run: { font, size: 22 } } } },
    sections: [{
      properties: { page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      children: kids as any,
    }],
  });

  const blob = await Packer.toBlob(doc);
  const safe = `${plan.meta.subject || "lesson"}-${plan.meta.topic || "plan"}`
    .replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 60).toLowerCase();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safe || "lesson-plan"}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
