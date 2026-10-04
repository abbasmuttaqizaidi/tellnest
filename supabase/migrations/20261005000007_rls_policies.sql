-- ==============================================================================
-- Tellnest Migration 07: Row Level Security (RLS) Policies
-- ==============================================================================

-- Enable RLS across all application tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_mutes ENABLE ROW LEVEL SECURITY;

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_warnings ENABLE ROW LEVEL SECURITY;

ALTER TABLE works ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_content_warnings ENABLE ROW LEVEL SECURITY;

ALTER TABLE library_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_likes ENABLE ROW LEVEL SECURITY;

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

ALTER TABLE moderation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 1. Profiles Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Public profiles are readable" ON profiles
    FOR SELECT USING (
        (is_public = true AND account_status = 'active')
        OR (id = current_profile_id())
    );

CREATE POLICY "Users can create own profile" ON profiles
    FOR INSERT WITH CHECK (
        clerk_user_id = current_clerk_user_id()
    );

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (
        id = current_profile_id()
    ) WITH CHECK (
        id = current_profile_id()
    );

-- ------------------------------------------------------------------------------
-- 2. User Preferences Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Users have full access to own preferences" ON user_preferences
    FOR ALL USING (
        user_id = current_profile_id()
    ) WITH CHECK (
        user_id = current_profile_id()
    );

-- ------------------------------------------------------------------------------
-- 3. Profile Links Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Public profile links are readable" ON profile_links
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = profile_links.profile_id 
            AND p.is_public = true 
            AND p.account_status = 'active'
        )
        OR profile_id = current_profile_id()
    );

CREATE POLICY "Users can manage own links" ON profile_links
    FOR ALL USING (
        profile_id = current_profile_id()
    ) WITH CHECK (
        profile_id = current_profile_id()
    );

-- ------------------------------------------------------------------------------
-- 4. Taxonomy Policies (Categories, Genres, Tags, Content Warnings)
-- ------------------------------------------------------------------------------
CREATE POLICY "Active categories are publicly readable" ON categories
    FOR SELECT USING (is_active = true);

CREATE POLICY "Active genres are publicly readable" ON genres
    FOR SELECT USING (is_active = true);

CREATE POLICY "Tags are publicly readable" ON tags
    FOR SELECT USING (true);

CREATE POLICY "Active content warnings are publicly readable" ON content_warnings
    FOR SELECT USING (is_active = true);

-- ------------------------------------------------------------------------------
-- 5. Works Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Public or unlisted published works are readable" ON works
    FOR SELECT USING (
        (visibility IN ('public', 'unlisted') AND publication_status = 'published')
        OR author_id = current_profile_id()
    );

CREATE POLICY "Authors can create own works" ON works
    FOR INSERT WITH CHECK (
        author_id = current_profile_id()
    );

CREATE POLICY "Authors can update own works" ON works
    FOR UPDATE USING (
        author_id = current_profile_id()
    ) WITH CHECK (
        author_id = current_profile_id()
    );

CREATE POLICY "Authors can delete own works" ON works
    FOR DELETE USING (
        author_id = current_profile_id()
    );

-- ------------------------------------------------------------------------------
-- 6. Chapters Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Published chapters of public/unlisted works are readable" ON chapters
    FOR SELECT USING (
        (
            status = 'published'
            AND EXISTS (
                SELECT 1 FROM works w 
                WHERE w.id = chapters.work_id 
                AND w.visibility IN ('public', 'unlisted') 
                AND w.publication_status = 'published'
            )
        )
        OR EXISTS (
            SELECT 1 FROM works w 
            WHERE w.id = chapters.work_id 
            AND w.author_id = current_profile_id()
        )
    );

CREATE POLICY "Authors can create chapters for own works" ON chapters
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM works w 
            WHERE w.id = chapters.work_id 
            AND w.author_id = current_profile_id()
        )
    );

CREATE POLICY "Authors can update chapters of own works" ON chapters
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM works w 
            WHERE w.id = chapters.work_id 
            AND w.author_id = current_profile_id()
        )
    );

CREATE POLICY "Authors can delete chapters of own works" ON chapters
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM works w 
            WHERE w.id = chapters.work_id 
            AND w.author_id = current_profile_id()
        )
    );

-- ------------------------------------------------------------------------------
-- 7. Work Junction Tables Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Work genres readable if work readable" ON work_genres
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM works w WHERE w.id = work_genres.work_id)
    );

CREATE POLICY "Authors manage work genres" ON work_genres
    FOR ALL USING (
        EXISTS (SELECT 1 FROM works w WHERE w.id = work_genres.work_id AND w.author_id = current_profile_id())
    );

CREATE POLICY "Work tags readable if work readable" ON work_tags
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM works w WHERE w.id = work_tags.work_id)
    );

CREATE POLICY "Authors manage work tags" ON work_tags
    FOR ALL USING (
        EXISTS (SELECT 1 FROM works w WHERE w.id = work_tags.work_id AND w.author_id = current_profile_id())
    );

CREATE POLICY "Work warnings readable if work readable" ON work_content_warnings
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM works w WHERE w.id = work_content_warnings.work_id)
    );

CREATE POLICY "Authors manage work warnings" ON work_content_warnings
    FOR ALL USING (
        EXISTS (SELECT 1 FROM works w WHERE w.id = work_content_warnings.work_id AND w.author_id = current_profile_id())
    );

-- ------------------------------------------------------------------------------
-- 8. Reader Library & Progress Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Users manage own library" ON library_items
    FOR ALL USING (user_id = current_profile_id())
    WITH CHECK (user_id = current_profile_id());

CREATE POLICY "Users manage own reading progress" ON reading_progress
    FOR ALL USING (user_id = current_profile_id())
    WITH CHECK (user_id = current_profile_id());

CREATE POLICY "Users manage own reading history" ON reading_history
    FOR ALL USING (user_id = current_profile_id())
    WITH CHECK (user_id = current_profile_id());

-- ------------------------------------------------------------------------------
-- 9. Social & Engagement Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Follows are publicly readable" ON follows
    FOR SELECT USING (true);

CREATE POLICY "Users can follow authors" ON follows
    FOR INSERT WITH CHECK (follower_id = current_profile_id());

CREATE POLICY "Users can unfollow authors" ON follows
    FOR DELETE USING (follower_id = current_profile_id());

CREATE POLICY "Users manage own work follows" ON work_follows
    FOR ALL USING (user_id = current_profile_id())
    WITH CHECK (user_id = current_profile_id());

CREATE POLICY "Work likes are publicly readable" ON work_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can like works" ON work_likes
    FOR INSERT WITH CHECK (user_id = current_profile_id());

CREATE POLICY "Users can unlike works" ON work_likes
    FOR DELETE USING (user_id = current_profile_id());

-- ------------------------------------------------------------------------------
-- 10. Comments & Reactions Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Visible comments are readable" ON comments
    FOR SELECT USING (
        (status = 'visible' AND deleted_at IS NULL)
        OR user_id = current_profile_id()
    );

CREATE POLICY "Authenticated users can create comments" ON comments
    FOR INSERT WITH CHECK (user_id = current_profile_id());

CREATE POLICY "Authors can update own comments" ON comments
    FOR UPDATE USING (user_id = current_profile_id())
    WITH CHECK (user_id = current_profile_id());

CREATE POLICY "Authors can delete own comments" ON comments
    FOR DELETE USING (user_id = current_profile_id());

CREATE POLICY "Comment reactions are publicly readable" ON comment_reactions
    FOR SELECT USING (true);

CREATE POLICY "Users can react to comments" ON comment_reactions
    FOR INSERT WITH CHECK (user_id = current_profile_id());

CREATE POLICY "Users can remove comment reactions" ON comment_reactions
    FOR DELETE USING (user_id = current_profile_id());

-- ------------------------------------------------------------------------------
-- 11. User Safety (Blocks & Mutes)
-- ------------------------------------------------------------------------------
CREATE POLICY "Users manage own blocks" ON user_blocks
    FOR ALL USING (blocker_id = current_profile_id())
    WITH CHECK (blocker_id = current_profile_id());

CREATE POLICY "Users manage own mutes" ON user_mutes
    FOR ALL USING (muter_id = current_profile_id())
    WITH CHECK (muter_id = current_profile_id());

-- ------------------------------------------------------------------------------
-- 12. Notifications
-- ------------------------------------------------------------------------------
CREATE POLICY "Users have full access to own notifications" ON notifications
    FOR ALL USING (user_id = current_profile_id())
    WITH CHECK (user_id = current_profile_id());

-- ------------------------------------------------------------------------------
-- 13. Moderation & Audit Policies
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can submit reports" ON moderation_reports
    FOR INSERT WITH CHECK (reporter_id = current_profile_id());

CREATE POLICY "Reporters can view own submitted reports" ON moderation_reports
    FOR SELECT USING (reporter_id = current_profile_id());

-- ------------------------------------------------------------------------------
-- 14. Analytics Events
-- ------------------------------------------------------------------------------
CREATE POLICY "Anyone can record analytics events" ON analytics_events
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Authors can view analytics for own works" ON analytics_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM works w 
            WHERE w.id = analytics_events.work_id 
            AND w.author_id = current_profile_id()
        )
    );
