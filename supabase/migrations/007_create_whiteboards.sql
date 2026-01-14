-- Migration: Create Whiteboards Feature
-- This creates tables for virtual whiteboards with draggable/resizable elements

-- Whiteboards table (canvas containers)
CREATE TABLE IF NOT EXISTS whiteboards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Basic info
    title TEXT NOT NULL DEFAULT 'Untitled Whiteboard',
    description TEXT DEFAULT '',

    -- Ownership
    owner_email TEXT NOT NULL,
    owner_name TEXT,

    -- Optional link to workflow item
    workflow_item_id UUID REFERENCES workflow_items(id) ON DELETE SET NULL,

    -- Canvas settings
    canvas_width INTEGER DEFAULT 3000,
    canvas_height INTEGER DEFAULT 2000,
    background_color TEXT DEFAULT '#f8fafc',
    grid_enabled BOOLEAN DEFAULT true,

    -- Sharing
    is_shared BOOLEAN DEFAULT false,
    shared_with TEXT[] DEFAULT '{}',
    share_mode TEXT DEFAULT 'view',  -- 'view' or 'edit'

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Archived status
    archived BOOLEAN DEFAULT false
);

-- Whiteboard elements table (sticky notes, images, etc.)
CREATE TABLE IF NOT EXISTS whiteboard_elements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    whiteboard_id UUID NOT NULL REFERENCES whiteboards(id) ON DELETE CASCADE,

    -- Element type
    element_type TEXT NOT NULL,  -- 'sticky', 'text', 'image', 'connector'

    -- Position and size
    x FLOAT NOT NULL DEFAULT 0,
    y FLOAT NOT NULL DEFAULT 0,
    width FLOAT NOT NULL DEFAULT 200,
    height FLOAT NOT NULL DEFAULT 150,
    rotation FLOAT DEFAULT 0,
    z_index INTEGER DEFAULT 0,

    -- Content (JSONB for flexibility)
    -- For sticky: { title, description, checkboxes: [{id, label, checked}], links: [{id, url, label}] }
    -- For image: { url, alt, originalWidth, originalHeight }
    -- For connector: { startElementId, endElementId, lineStyle, arrowHead }
    content JSONB NOT NULL DEFAULT '{}',

    -- Styling
    background_color TEXT DEFAULT '#fef3c7',
    border_color TEXT DEFAULT '#fbbf24',
    text_color TEXT DEFAULT '#1f2937',

    -- Lock state for collaborative editing
    locked_by TEXT DEFAULT NULL,
    locked_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by TEXT
);

-- Indexes for performance
CREATE INDEX idx_whiteboards_owner ON whiteboards(owner_email);
CREATE INDEX idx_whiteboards_workflow_item ON whiteboards(workflow_item_id);
CREATE INDEX idx_whiteboards_shared ON whiteboards(is_shared);
CREATE INDEX idx_whiteboard_elements_board ON whiteboard_elements(whiteboard_id);
CREATE INDEX idx_whiteboard_elements_type ON whiteboard_elements(element_type);

-- Enable Row Level Security
ALTER TABLE whiteboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE whiteboard_elements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for whiteboards

-- Read: Owner or shared with
CREATE POLICY "Read own or shared whiteboards" ON whiteboards
    FOR SELECT TO authenticated
    USING (
        owner_email = auth.jwt() ->> 'email'
        OR (auth.jwt() ->> 'email') = ANY(shared_with)
    );

-- Insert: Only owner can create
CREATE POLICY "Create own whiteboards" ON whiteboards
    FOR INSERT TO authenticated
    WITH CHECK (owner_email = auth.jwt() ->> 'email');

-- Update: Owner or shared with edit permission
CREATE POLICY "Update own or editable whiteboards" ON whiteboards
    FOR UPDATE TO authenticated
    USING (
        owner_email = auth.jwt() ->> 'email'
        OR (
            (auth.jwt() ->> 'email') = ANY(shared_with)
            AND share_mode = 'edit'
        )
    );

-- Delete: Owner only
CREATE POLICY "Delete own whiteboards" ON whiteboards
    FOR DELETE TO authenticated
    USING (owner_email = auth.jwt() ->> 'email');

-- RLS Policies for whiteboard_elements (inherit from parent whiteboard)

CREATE POLICY "Elements follow whiteboard access" ON whiteboard_elements
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM whiteboards wb
            WHERE wb.id = whiteboard_elements.whiteboard_id
            AND (
                wb.owner_email = auth.jwt() ->> 'email'
                OR (auth.jwt() ->> 'email') = ANY(wb.shared_with)
            )
        )
    );

-- Enable Realtime for collaborative editing
ALTER PUBLICATION supabase_realtime ADD TABLE whiteboards;
ALTER PUBLICATION supabase_realtime ADD TABLE whiteboard_elements;
