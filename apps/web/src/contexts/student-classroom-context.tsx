'use client';

import { createContext, useContext } from 'react';
import type { ClassroomState } from '@/hooks/use-classroom-state';

export interface StudentClassroomContextValue {
  locked: boolean;
  label: string;
  state: ClassroomState | null;
  loaded: boolean;
}

const StudentClassroomContext = createContext<StudentClassroomContextValue>({
  locked: false,
  label: '',
  state: null,
  loaded: false,
});

export function StudentClassroomProvider({
  value,
  children,
}: {
  value: StudentClassroomContextValue;
  children: React.ReactNode;
}) {
  return (
    <StudentClassroomContext.Provider value={value}>{children}</StudentClassroomContext.Provider>
  );
}

export function useStudentClassroomLock() {
  return useContext(StudentClassroomContext);
}
