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

  // CRAppTypes from schema.prisma
    
  type User = {
    articles: Article[];
    createdAt: Date;
    email: String;
    firstName: String;
    id: String;
    lastName: String;
    passwordHash: String;
    posts: Post[];
    profile: Profile?;
    role: Role;
    todos: Todo[];
    updatedAt: DateTime?;
    userAuthToken: String;
  };

  type Profile = {
    bio: String?;
    createdAt: Date;
    id: String;
    updatedAt: DateTime?;
    user: User;
    userId: String;
  };

  type Article = {
    author: User;
    authorId: String;
    content: String;
    id: String;
    title: String;
  };

  type Post = {
    author: User;
    authorId: String;
    categories: Category[];
    content: String?;
    createdAt: Date;
    id: String;
    published: Boolean;
    title: String;
    updatedAt: DateTime?;
  };

  type Category = {
    id: Int;
    name: String;
    posts: Post[];
  };

  type Todo = {
    completed: Boolean;
    content: String;
    createdAt: Date;
    id: String;
    priority: Int;
    title: String;
    updatedAt: DateTime?;
    user: User;
    userId: String;
  };

}