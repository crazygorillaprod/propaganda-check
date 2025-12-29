'use client';

import { useState, useRef } from 'react';
import type { TeachingTake } from '@/lib/types';

interface TeachingTakeDisplayProps {
  teachingTake: TeachingTake;
  topic?: string;
  isLocked?: boolean;
}

export function TeachingTakeDisplay({ teachingTake, topic, isLocked = false }: TeachingTakeDisplayProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('summary');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const BRAND = 'Propaganda Buster by BFMbreakdown';
  const TAGLINE = 'Evidence-first analysis for people who speak publicly';

  const startCheckout = async (tier: 'pro' | 'creator') => {
    const email = typeof window !== 'undefined' ? localStorage.getItem('user_email') : null;
    if (!email) {
      window.location.href = '/';
      return;
    }
    const res = await fetch('/api/billing/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, tier }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = (data && (data.error || data.message)) || 'Could not start checkout';
      alert(msg);
      return;
    }

    if (data?.url) {
      window.location.href = data.url;
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const copyToClipboard = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const generateSocialSnippet = (platform: 'twitter' | 'linkedin' | 'facebook') => {
    const maxLength = platform === 'twitter' ? 280 : 700;
    const summary = teachingTake.executive_summary.split('\n')[0];
    const snippet = `${summary}\n\n${teachingTake.rebuttal_script.short}\n\n#FactCheck #MediaLiteracy`;
    return snippet.substring(0, maxLength);
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      let yPos = 20;
      const lineHeight = 7;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 20;
      const maxWidth = 170;

      const addText = (text: string, fontSize: number = 10, isBold: boolean = false) => {
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        const lines = doc.splitTextToSize(text, maxWidth);
        
        lines.forEach((line: string) => {
          if (yPos > pageHeight - margin) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(line, margin, yPos);
          yPos += lineHeight;
        });
      };

      const addSection = (title: string, content: string | string[]) => {
        yPos += 5;
        addText(title, 14, true);
        yPos += 3;
        
        if (Array.isArray(content)) {
          content.forEach(item => {
            addText(`• ${item}`);
          });
        } else {
          addText(content);
        }
      };

      // Title
      addText('TEACHING TAKE', 18, true);
      addText('Evidence-Based Analysis', 12);
      if (topic) {
        yPos += 2;
        addText(topic, 11, true);
      }
      yPos += 5;

      // Sections
      addSection('EXECUTIVE SUMMARY', teachingTake.executive_summary);
      addSection('WHAT WE KNOW', teachingTake.what_we_know);
      addSection('WHAT IS UNCERTAIN', teachingTake.what_is_uncertain);
      addSection('HOW THIS GETS SPUN', teachingTake.how_this_gets_spun);
      addSection('PRO-DEMOCRACY TAKE', teachingTake.pro_democracy_take);
      
      yPos += 5;
      addText('REBUTTAL SCRIPTS', 14, true);
      yPos += 3;
      addText('Quick (15-25 sec)', 11, true);
      addText(teachingTake.rebuttal_script.short);
      yPos += 3;
      addText('Medium (60 sec)', 11, true);
      addText(teachingTake.rebuttal_script.medium);
      yPos += 3;
      addText('Long (2-3 min)', 11, true);
      addText(teachingTake.rebuttal_script.long);
      
      addSection('TALK TRACKS', teachingTake.talk_tracks);
      addSection('QUESTIONS TO ASK', teachingTake.questions_to_ask);
      addSection('WHAT TO SHARE INSTEAD', teachingTake.what_to_share_instead);
      
      yPos += 5;
      addText('ACTION PLAN', 14, true);
      yPos += 3;
      addText('Today:', 11, true);
      teachingTake.action_plan.today.forEach(item => addText(`• ${item}`));
      yPos += 2;
      addText('This Week:', 11, true);
      teachingTake.action_plan.this_week.forEach(item => addText(`• ${item}`));
      yPos += 2;
      addText('Ongoing:', 11, true);
      teachingTake.action_plan.ongoing.forEach(item => addText(`• ${item}`));

      // Footer
      yPos += 10;
      doc.setFontSize(8);
      doc.setTextColor(128);
      addText(`Generated by ${BRAND} — ${TAGLINE}`);

      doc.save(`teaching-take-${Date.now()}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('PDF export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToText = () => {
    const exportText = `
TEACHING TAKE - Evidence-Based Analysis
========================================
${topic ? `\nTopic: ${topic}\n` : ''}
EXECUTIVE SUMMARY
${teachingTake.executive_summary}

WHAT WE KNOW
${teachingTake.what_we_know.map((item, i) => `${i + 1}. ${item}`).join('\n')}

WHAT IS UNCERTAIN
${teachingTake.what_is_uncertain.map((item, i) => `${i + 1}. ${item}`).join('\n')}

HOW THIS GETS SPUN
${teachingTake.how_this_gets_spun.map((item, i) => `${i + 1}. ${item}`).join('\n')}

PRO-DEMOCRACY TAKE
${teachingTake.pro_democracy_take}

REBUTTAL SCRIPTS
================

Quick (15-25 sec):
${teachingTake.rebuttal_script.short}

Medium (60 sec):
${teachingTake.rebuttal_script.medium}

Long (2-3 min):
${teachingTake.rebuttal_script.long}

TALK TRACKS
===========
${teachingTake.talk_tracks.map((item, i) => `${i + 1}. ${item}`).join('\n')}

QUESTIONS TO ASK
================
${teachingTake.questions_to_ask.map((item, i) => `${i + 1}. ${item}`).join('\n')}

WHAT TO SHARE INSTEAD
=====================
${teachingTake.what_to_share_instead.map((item, i) => `${i + 1}. ${item}`).join('\n')}

ACTION PLAN
===========

Today:
${teachingTake.action_plan.today.map((item, i) => `${i + 1}. ${item}`).join('\n')}

This Week:
${teachingTake.action_plan.this_week.map((item, i) => `${i + 1}. ${item}`).join('\n')}

Ongoing:
${teachingTake.action_plan.ongoing.map((item, i) => `${i + 1}. ${item}`).join('\n')}

---
Generated by ${BRAND} — ${TAGLINE}
`.trim();

    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `teaching-take-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent(topic || 'Teaching Take - Evidence-Based Analysis');
    const body = encodeURIComponent(
      `I thought you might find this analysis helpful:\n\n${teachingTake.rebuttal_script.short}\n\nFull analysis: [Link would go here]\n\nGenerated by ${BRAND}`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const sections = [
    {
      id: 'summary',
      title: 'Executive Summary',
      icon: '📋',
      content: teachingTake.executive_summary,
      copyable: true,
    },
    {
      id: 'known',
      title: 'What We Know',
      icon: '✓',
      content: teachingTake.what_we_know,
      copyable: true,
    },
    {
      id: 'uncertain',
      title: 'What Is Uncertain',
      icon: '❓',
      content: teachingTake.what_is_uncertain,
      copyable: true,
    },
    {
      id: 'spin',
      title: 'How This Gets Spun',
      icon: '🔄',
      content: teachingTake.how_this_gets_spun,
      copyable: true,
    },
    {
      id: 'democracy',
      title: 'Pro-Democracy Take',
      icon: '🗳️',
      content: teachingTake.pro_democracy_take,
      copyable: true,
    },
  ];

  return (
    <div className="relative">
      {/* Upgrade Overlay for Locked Content */}
      {isLocked && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-lg">
          <div className="bg-white p-8 rounded-xl shadow-2xl border-2 border-purple-300 max-w-md text-center">
            <div className="text-5xl mb-4">🔒</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Not Getting Embarrassed: Priceless</h3>
            <p className="text-gray-600 mb-6">
              Full Teaching Takes with rebuttal scripts, talk tracks, and exportable resources. Designed for people who publish opinions publicly.
            </p>
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-left">
                <svg className="h-5 w-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-gray-700">Never spread misinformation</span>
              </div>
              <div className="flex items-center gap-3 text-left">
                <svg className="h-5 w-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-gray-700">Have receipts ready instantly</span>
              </div>
              <div className="flex items-center gap-3 text-left">
                <svg className="h-5 w-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-gray-700">Protect your reputation</span>
              </div>
              <div className="flex items-center gap-3 text-left">
                <svg className="h-5 w-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-gray-700">50 fact checks/month</span>
              </div>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => startCheckout('pro')}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 font-semibold text-lg shadow-lg transform transition hover:scale-105"
              >
                Pro (Civic) - $25/month
              </button>
              <button
                onClick={() => startCheckout('creator')}
                className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 font-semibold text-lg shadow-lg transform transition hover:scale-105"
              >
                Creator - $99/month
                <span className="text-xs block mt-1 opacity-90">300 checks + rollover</span>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-3">Cancel anytime • 14-day money-back guarantee</p>
          </div>
        </div>
      )}

      {/* Main Content (blurred if locked) */}
      <div className={`space-y-4 ${isLocked ? 'blur-md pointer-events-none select-none' : ''}`} ref={contentRef}>
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-6 border border-indigo-200">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Teaching Take</h2>
            <p className="text-sm text-gray-600">
              Evidence-based resources for countering misinformation
            </p>
            {topic && (
              <p className="text-xs text-gray-500 mt-1 italic">Topic: {topic}</p>
            )}
          </div>
          
          {/* Export & Share Actions */}
          <div className="flex gap-2">
            <button
              onClick={exportToPDF}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition-colors text-sm font-medium"
            >
              {isExporting ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  PDF
                </>
              )}
            </button>
            
            <button
              onClick={exportToText}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              TXT
            </button>
            
            <button
              onClick={shareViaEmail}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email
            </button>
          </div>
        </div>
      </div>

      {/* Main Sections */}
      <div className="space-y-3">
        {sections.map((section) => (
          <div
            key={section.id}
            className="bg-white border rounded-lg shadow-sm overflow-hidden"
          >
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{section.icon}</span>
                <span className="font-semibold text-gray-900">{section.title}</span>
              </div>
              <span className="text-gray-400">
                {expandedSection === section.id ? '▼' : '▶'}
              </span>
            </button>

            {expandedSection === section.id && (
              <div className="px-4 py-4 bg-gray-50 border-t">
                {Array.isArray(section.content) ? (
                  <ul className="space-y-2">
                    {section.content.map((item, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="text-blue-600 mt-1">•</span>
                        <span className="text-gray-700 leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {section.content}
                  </p>
                )}

                {section.copyable && (
                  <button
                    onClick={() => copyToClipboard(
                      Array.isArray(section.content) 
                        ? section.content.join('\n\n') 
                        : section.content,
                      section.id
                    )}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {copiedSection === section.id ? '✓ Copied!' : 'Copy to clipboard'}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Rebuttal Scripts */}
      <div className="bg-white border rounded-lg shadow-sm">
        <button
          onClick={() => toggleSection('rebuttals')}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">💬</span>
            <span className="font-semibold text-gray-900">Rebuttal Scripts</span>
          </div>
          <span className="text-gray-400">
            {expandedSection === 'rebuttals' ? '▼' : '▶'}
          </span>
        </button>

        {expandedSection === 'rebuttals' && (
          <div className="px-4 py-4 bg-gray-50 border-t space-y-4">
            <div className="bg-white p-4 rounded border">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-900">Quick (15-25 sec)</h4>
                <button
                  onClick={() => copyToClipboard(teachingTake.rebuttal_script.short, 'short')}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {copiedSection === 'short' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-gray-700 leading-relaxed">
                {teachingTake.rebuttal_script.short}
              </p>
            </div>

            <div className="bg-white p-4 rounded border">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-900">Medium (60 sec)</h4>
                <button
                  onClick={() => copyToClipboard(teachingTake.rebuttal_script.medium, 'medium')}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {copiedSection === 'medium' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-gray-700 leading-relaxed">
                {teachingTake.rebuttal_script.medium}
              </p>
            </div>

            <div className="bg-white p-4 rounded border">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-900">Long (2-3 min)</h4>
                <button
                  onClick={() => copyToClipboard(teachingTake.rebuttal_script.long, 'long')}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {copiedSection === 'long' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {teachingTake.rebuttal_script.long}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Talk Tracks */}
      <div className="bg-white border rounded-lg shadow-sm">
        <button
          onClick={() => toggleSection('talks')}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🗣️</span>
            <span className="font-semibold text-gray-900">Talk Tracks</span>
          </div>
          <span className="text-gray-400">
            {expandedSection === 'talks' ? '▼' : '▶'}
          </span>
        </button>

        {expandedSection === 'talks' && (
          <div className="px-4 py-4 bg-gray-50 border-t">
            <div className="space-y-3">
              {teachingTake.talk_tracks.map((track, idx) => (
                <div key={idx} className="bg-white p-3 rounded border">
                  <p className="text-gray-700 text-sm leading-relaxed">{track}</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => copyToClipboard(teachingTake.talk_tracks.join('\n\n'), 'talks')}
              className="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              {copiedSection === 'talks' ? '✓ Copied!' : 'Copy all talk tracks'}
            </button>
          </div>
        )}
      </div>

      {/* Questions to Ask */}
      <div className="bg-white border rounded-lg shadow-sm">
        <button
          onClick={() => toggleSection('questions')}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">❔</span>
            <span className="font-semibold text-gray-900">Questions to Ask</span>
          </div>
          <span className="text-gray-400">
            {expandedSection === 'questions' ? '▼' : '▶'}
          </span>
        </button>

        {expandedSection === 'questions' && (
          <div className="px-4 py-4 bg-gray-50 border-t">
            <ul className="space-y-2">
              {teachingTake.questions_to_ask.map((question, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="text-purple-600 mt-1">→</span>
                  <span className="text-gray-700 leading-relaxed">{question}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* What to Share Instead */}
      <div className="bg-white border rounded-lg shadow-sm">
        <button
          onClick={() => toggleSection('share')}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">📤</span>
            <span className="font-semibold text-gray-900">What to Share Instead</span>
          </div>
          <span className="text-gray-400">
            {expandedSection === 'share' ? '▼' : '▶'}
          </span>
        </button>

        {expandedSection === 'share' && (
          <div className="px-4 py-4 bg-gray-50 border-t">
            <ul className="space-y-2">
              {teachingTake.what_to_share_instead.map((item, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span className="text-gray-700 leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Action Plan */}
      <div className="bg-white border rounded-lg shadow-sm">
        <button
          onClick={() => toggleSection('action')}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎯</span>
            <span className="font-semibold text-gray-900">Action Plan</span>
          </div>
          <span className="text-gray-400">
            {expandedSection === 'action' ? '▼' : '▶'}
          </span>
        </button>

        {expandedSection === 'action' && (
          <div className="px-4 py-4 bg-gray-50 border-t space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Today</h4>
              <ul className="space-y-1">
                {teachingTake.action_plan.today.map((action, idx) => (
                  <li key={idx} className="flex gap-2 text-sm">
                    <span className="text-blue-600">•</span>
                    <span className="text-gray-700">{action}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">This Week</h4>
              <ul className="space-y-1">
                {teachingTake.action_plan.this_week.map((action, idx) => (
                  <li key={idx} className="flex gap-2 text-sm">
                    <span className="text-purple-600">•</span>
                    <span className="text-gray-700">{action}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Ongoing</h4>
              <ul className="space-y-1">
                {teachingTake.action_plan.ongoing.map((action, idx) => (
                  <li key={idx} className="flex gap-2 text-sm">
                    <span className="text-green-600">•</span>
                    <span className="text-gray-700">{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Social Media Snippets */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-6 border border-blue-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Social Media Snippets
        </h3>
        
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Twitter/X (280 chars)</span>
              <button
                onClick={() => copyToClipboard(generateSocialSnippet('twitter'), 'twitter')}
                className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
              >
                {copiedSection === 'twitter' ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-sm text-gray-600 bg-white p-3 rounded border border-gray-200">
              {generateSocialSnippet('twitter')}
            </p>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">LinkedIn/Facebook</span>
              <button
                onClick={() => copyToClipboard(generateSocialSnippet('linkedin'), 'linkedin')}
                className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
              >
                {copiedSection === 'linkedin' ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-sm text-gray-600 bg-white p-3 rounded border border-gray-200 line-clamp-3">
              {generateSocialSnippet('linkedin')}
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-600">
        <p className="font-medium mb-2">⚠️ Important Disclaimer:</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>This is for educational/discussion purposes</li>
          <li>Not legal, professional, or political advice</li>
          <li>Verify all information independently</li>
          <li>Citations provided are starting points, not comprehensive</li>
        </ul>
      </div>
      </div>
    </div>
  );
}
