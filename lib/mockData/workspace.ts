

export type IconName = keyof typeof import('lucide-react');

export interface WorkspacePage {
    id: string;
    title: string;
    icon: string; // Storing string name of lucide icon rather than component directly
    slug: string;
    children?: WorkspacePage[];
}

export const mockWorkspacePages: WorkspacePage[] = [
    {
        id: '1',
        title: 'Product Vision',
        icon: 'FileText',
        slug: 'product-vision',
    },
    {
        id: '2',
        title: 'Engineering',
        icon: 'LayoutGrid',
        slug: 'engineering',
        children: [
            {
                id: '2-1',
                title: 'Architecture Review',
                icon: 'FileText',
                slug: 'architecture-review',
            },
            {
                id: '2-2',
                title: 'Frontend Components',
                icon: 'Component',
                slug: 'frontend-components',
                children: [
                    {
                        id: '2-2-1',
                        title: 'Sidebar Nested Render',
                        icon: 'FileText',
                        slug: 'sidebar-nested-render',
                    }
                ]
            }
        ]
    },
    {
        id: '3',
        title: 'Design System',
        icon: 'Palette',
        slug: 'design-system',
    },
    {
        id: '4',
        title: 'Q3 Planning',
        icon: 'BarChart2',
        slug: 'q3-planning',
    }
];
