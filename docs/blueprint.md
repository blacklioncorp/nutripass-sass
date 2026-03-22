# **App Name**: NutriPass

## Core Features:

- Parent Web Portal: A web application for parents to view school menus, manage their child's wallet balance (top-up funds), and set dietary restrictions or block specific food items for allergies.
- POS (Point of Sale) Tablet Application: A fast and intuitive tablet interface for cafeteria staff to process student purchases. Supports emulated NFC tag input for quick student identification, balance validation, and transaction processing against multiple student wallets.
- Student Digital Wallets: Manages multiple digital wallets per student (e.g., 'comedor' for meals, 'snack' for breaks) with immutable transaction logging for auditing and financial tracking.
- Multi-Tenant Data Isolation: Strict data isolation between schools using Row Level Security (RLS) policies in Supabase, ensuring that each school's data is only accessible to authorized users from that school.
- Secure Payment Processing: Integration with payment gateways like Stripe/MercadoPago to securely process parent payments for wallet top-ups, ensuring transactions are recorded safely in the database.
- AI-powered Allergy Alert Tool: An AI tool that suggests safe alternative food options or alerts cafeteria staff to potential allergens based on parent-specified dietary restrictions and menu items.

## Style Guidelines:

- Primary action color: A vibrant yet clean 'Principal Blue' (#7CB9E8), reminiscent of primary school themes, used for key interactive elements.
- Background color: A very light, almost white 'Fondo' (#F0F8FF), providing a clean and spacious canvas, echoing the cool blue of the primary color.
- Accent color: A warm, inviting 'Acento' yellow/gold (#F4C430), used for highlighting important information or drawing attention to call-to-actions, providing a friendly contrast.
- Text color: A deep, readable 'Texto Azul' (#004B87) for headings and main body text, ensuring high legibility on the light background.
- Alert/Success color: A fresh, reassuring green 'Alert/Éxito' (#98FB98), for system messages indicating successful operations or positive feedback.
- Body and headline font: 'Inter' (sans-serif), chosen for its modern, clean, and highly readable characteristics, suitable for both short titles and longer informational texts like menus or transaction details in an educational context.
- Utilize simple, friendly, and recognizable icons relevant to food, school, money, and parental controls to enhance user comprehension and navigation.
- Adopt a clean, intuitive, and highly functional layout with clear content hierarchy, responsive for parents' web app, and optimized for quick interactions on the POS tablet application.