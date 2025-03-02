export interface Competition {
    id: string;
    name: string;
    location?: string;
    days: string[];
    categories: Category[];
}

export interface Category {
    id: string;
    name: string;
    type: string;
}


export interface Heat {
    id: string
    name: string;
    time: string;
    day: string;
}

export interface Registration {
    id?: string;
    dorsal: string;
    category: string;
    participants: string[];
}


export interface Participant {
    id: string;
    name: string;
    email: string;
    contact: string;
}
