// In a real app, you would use:
// import { createClient } from '@supabase/supabase-js'
// export const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

// Mock implementation for development/demo purposes
export const mockStudents = [
  { id: 's1', full_name: 'Juan Pérez', nfc_tag_uid: '12345', allergies: ['Maní', 'Lactosa'], school_id: 'sch1' },
  { id: 's2', full_name: 'María García', nfc_tag_uid: '67890', allergies: [], school_id: 'sch1' },
];

export const mockWallets = [
  { id: 'w1', student_id: 's1', type: 'comedor', balance: 450.00 },
  { id: 'w2', student_id: 's1', type: 'snack', balance: 50.00 },
  { id: 'w3', student_id: 's2', type: 'comedor', balance: 1200.00 },
];

export const mockProducts = [
  { id: 'p1', name: 'Almuerzo Ejecutivo', price: 85.00, ingredients: ['Pollo', 'Arroz', 'Ensalada'] },
  { id: 'p2', name: 'Sándwich de Jamón', price: 35.00, ingredients: ['Trigo', 'Jamón', 'Queso'] },
  { id: 'p3', name: 'Jugo Natural', price: 20.00, ingredients: ['Fruta'] },
];

export const supabase = {
  from: (table: string) => ({
    select: (query: string) => ({
      eq: (col: string, val: any) => ({
        single: async () => {
          if (table === 'students' && col === 'nfc_tag_uid') {
            const student = mockStudents.find(s => s.nfc_tag_uid === val);
            return { data: student, error: student ? null : { message: 'Student not found' } };
          }
          return { data: null, error: { message: 'Not implemented' } };
        },
        data: table === 'wallets' ? mockWallets.filter(w => w.student_id === val) : []
      })
    })
  })
};