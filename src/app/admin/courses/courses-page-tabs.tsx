'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CoursesClient from './courses-client';
import TimetableView from './timetable-view';
import BlockView from './block-view';
import SemesterGrid from './semester-grid';
import CoursesManager from './courses-manager';

type Course    = { id: number; course_name: string; course_code: string; credits: number };
type SectionWithInstructors = {
  id: number; course_name: string; course_code: string; credits: number;
  section_number: string; room: string | null; timeframe_label: string | null;
  timeframe_id: number | null; enrolled_count: number; booking_count: number;
  instructors: { id: number; full_name: string }[];
};
type LegacySection = SectionWithInstructors & { instructor_id: number | null; instructor_name: string | null };
type Timeframe = { id: number; label: string; start_date: string; end_date: string; semester_id: number | null };
type Semester  = { id: number; name: string };
type User      = { id: number; full_name: string };
type Enrollment = { section_id: number; student_id: number; student_name: string };
type TimetableBooking = {
  id: number; course_code: string; course_name: string; section_number: string;
  date: string; start_time: string; end_time: string; room: string | null; instructor_name: string | null;
};

type Props = {
  sections: SectionWithInstructors[];
  courses: Course[];
  timeframes: Timeframe[];
  semesters: Semester[];
  instructors: User[];
  students: User[];
  enrollments: Enrollment[];
  bookings: TimetableBooking[];
};

const TABS = [
  {
    id: 'semester',
    label: 'Semester',
    icon: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>,
  },
  {
    id: 'blocks',
    label: 'Block View',
    icon: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  },
  {
    id: 'sections',
    label: 'All Sections',
    icon: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  },
  {
    id: 'schedule',
    label: 'Schedule',
    icon: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="8" y2="14"/><line x1="12" y1="14" x2="12" y2="14"/><line x1="16" y1="14" x2="16" y2="14"/></svg>,
  },
  {
    id: 'catalog',
    label: 'Courses',
    icon: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  },
] as const;

type TabId = typeof TABS[number]['id'];

const TAB_DESC: Record<TabId, string> = {
  semester: 'Whole-semester overview — section groups across every block, like the printed schedule.',
  blocks:   'Sections organised by block — select a timeframe to manage.',
  sections: 'All sections list — assign instructors, enroll students.',
  schedule: 'Weekly timetable of all booked teaching slots.',
  catalog:  'Course catalog — create, rename, and delete courses.',
};

export default function CoursesPageTabs({ sections, courses, timeframes, semesters, instructors, students, enrollments, bookings }: Props) {
  const [tab, setTab] = useState<TabId>('semester');
  const router = useRouter();

  // Refresh server data on mount so that navigating away and back always
  // shows current DB state — the Next.js router cache can serve a stale
  // RSC payload that predates silent block-view mutations.
  useEffect(() => {
    router.refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function switchTab(id: TabId) {
    setTab(id);
    // Silent mutations skip revalidation; refresh after a brief delay so any
    // in-flight DB writes (optimistic actions) finish before we re-fetch,
    // otherwise the server can return stale data that wipes optimistic state.
    setTimeout(() => router.refresh(), 300);
  }

  // CoursesClient expects legacy shape; adapt
  const legacySections: LegacySection[] = sections.map(s => ({
    ...s,
    instructor_id: s.instructors[0]?.id ?? null,
    instructor_name: s.instructors[0]?.full_name ?? null,
  }));

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--tx)' }}>Courses & Sections</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--tx-2)' }}>{TAB_DESC[tab]}</p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl max-w-full overflow-x-auto"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => switchTab(t.id)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all shrink-0 whitespace-nowrap"
              style={{
                background: tab === t.id ? 'var(--accent)' : 'transparent',
                color: tab === t.id ? '#fff' : 'var(--tx-2)',
                boxShadow: tab === t.id ? '0 1px 4px rgba(245,132,31,0.3)' : 'none',
              }}>
              <span style={{ color: tab === t.id ? '#fff' : 'var(--tx-3)' }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Panels stay mounted (hidden with CSS) so optimistic client state
          survives tab switches — unmounting reverted fresh adds to stale props. */}
      <div className={tab === 'semester' ? 'animate-fade-in' : 'hidden'}>
        <SemesterGrid sections={sections} timeframes={timeframes} />
      </div>

      <div className={tab === 'blocks' ? 'animate-fade-in' : 'hidden'}>
        <BlockView
          sections={sections}
          courses={courses}
          timeframes={timeframes}
          semesters={semesters}
          instructors={instructors}
          students={students}
          enrollments={enrollments}
        />
      </div>

      <div className={tab === 'sections' ? 'animate-fade-in' : 'hidden'}>
        <CoursesClient
          sections={legacySections as never}
          instructors={instructors}
          students={students}
          enrollments={enrollments}
          timeframes={timeframes}
        />
      </div>

      <div className={tab === 'schedule' ? 'animate-fade-in' : 'hidden'}>
        <TimetableView bookings={bookings} />
      </div>

      <div className={tab === 'catalog' ? 'animate-fade-in' : 'hidden'}>
        <CoursesManager courses={courses} sections={sections} />
      </div>
    </div>
  );
}
