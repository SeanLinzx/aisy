'use client';

import { createContext, useContext } from 'react';

export interface StudentClassroomContextValue {
  locked: boolean;
  label: string;
}

const StudentClassroomContext = createContext<StudentClassroomContextValue>({
  locked: false,
  label: '',
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
