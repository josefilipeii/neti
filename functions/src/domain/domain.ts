export interface Competition {
    id: string;
    name: string;
    location?: string;
    days: number;
    categories: Category[];
}

export interface Category {
    id: string;
    name: string;
    type: string;
}