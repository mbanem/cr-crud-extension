declare global {
  type Role = 'USER' | 'ADMIN' | 'VISITOR';

  namespace App {
    // interface Error {}
    interface Locals {
      user: {
        id: string;
        firstName: string;
        lastName: string;
        role: string;
      };
    }
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}