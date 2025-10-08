
  // CRAppTypes from schema.prisma
  export type Role = 'USER' | 'ADMIN' | 'VISITOR';
  
  export type User = {
    articles: Article[];
    createdAt: Date;
    email: String;
    firstName: String;
    id: String;
    lastName: String;
    passwordHash: String;
    posts: Post[];
    profile: Profile;
    role: Role;
    todos: Todo[];
    updatedAt: Date;
    userAuthToken: String;
  };

  export type Profile = {
    bio: String;
    createdAt: Date;
    id: String;
    updatedAt: Date;
    user: User;
    userId: String;
  };

  export type Article = {
    author: User;
    authorId: String;
    content: String;
    id: String;
    title: String;
  };

  export type Post = {
    author: User;
    authorId: String;
    categories: Category[];
    content: String;
    createdAt: Date;
    id: String;
    published: Boolean;
    title: String;
    updatedAt: Date;
  };

  export type Category = {
    id: Number;
    name: String;
    posts: Post[];
  };

  export type Todo = {
    completed: Boolean;
    content: String;
    createdAt: Date;
    id: String;
    priority: Number;
    title: String;
    updatedAt: Date;
    user: User;
    userId: String;
  };

  // import type { User, Profile, Role, Article, Post, Category, Todo } from '$lib/types/types'
