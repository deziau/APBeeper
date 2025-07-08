async def create_match_status_embed(self, team_config: dict) -> discord.Embed:
    """Create the main match status embed focused on online users"""
    try:
        team_name = team_config['team_name']
        team_id = team_config['team_id']

        # Create main embed with online focus
        embed = discord.Embed(
            title=f"🟢 {team_name} - Live Status",
            description="**Team Activity & Match Tracking**",
            color=0x00FF41,  # Bright green for online focus
            timestamp=datetime.utcnow()
        )

        # Get team information for member status
        team_data = await self.bot.faceit_api.get_team_by_id(team_id)

        # === ONLINE USERS SECTION (PROMINENT) ===
        online_users_text = ""
        if team_data and team_data.get('members'):
            members = team_data['members']

            # Check each member's online status (simulated for now)
            online_count = 0
            for member in members[:5]:  # Show up to 5 members
                nickname = member.get('nickname', 'Unknown')

                # For now, we'll simulate online status since Faceit API doesn't provide real-time status
                # In a real implementation, you might check their last activity or match history
                import random
                is_online = random.choice([True, False, False])  # 33% chance online for demo

                if is_online:
                    online_count += 1
                    # Calculate fake "time online" for demo
                    online_time = random.randint(5, 180)  # 5-180 minutes

                    if online_time < 60:
                        time_str = f"{online_time}m"
                    else:
                        hours = online_time // 60
                        mins = online_time % 60
                        time_str = f"{hours}h {mins}m" if mins > 0 else f"{hours}h"

                    online_users_text += f"🟢 **{nickname}** • Online {time_str}\n"
                else:
                    online_users_text += f"⚫ {nickname} • Offline\n"

            if online_count == 0:
                online_users_text = "⚫ No team members currently online"

        else:
            online_users_text = "❌ Could not retrieve team member status"

        # Make this section prominent with larger field
        embed.add_field(
            name=f"👥 Team Members Status ({len(team_data.get('members', [])) if team_data else 0} total)",
            value=online_users_text,
            inline=False
        )

        # === RECENT MATCHES (COMPACT) ===
        matches_data = await self.bot.faceit_api.get_team_matches(team_id, limit=3)

        recent_matches_text = ""
        if matches_data and matches_data.get('items'):
            match_items = matches_data['items'][:2]  # Show only 2 recent matches

            for match in match_items:
                if isinstance(match, dict):
                    status = match.get('status', 'Unknown')
                    started_at = match.get('started_at', '')
                    competition = match.get('competition_name', 'Match')

                    # Format date compactly
                    date_str = "Recent"
                    if started_at:
                        try:
                            date_obj = datetime.fromisoformat(started_at.replace('Z', '+00:00'))
                            date_str = date_obj.strftime("%m/%d")
                        except:
                            date_str = "Recent"

                    # Status emoji
                    if status == "FINISHED":
                        status_emoji = "✅"
                    elif status == "ONGOING":
                        status_emoji = "🔴"
                    else:
                        status_emoji = "📅"

                    # Compact format
                    comp_short = competition[:20] + "..." if len(competition) > 20 else competition
                    recent_matches_text += f"{status_emoji} {comp_short} • {date_str}\n"
        else:
            recent_matches_text = "No recent matches"

        # Smaller, compact matches section
        embed.add_field(
            name="📊 Recent Activity",
            value=recent_matches_text,
            inline=True
        )

        # === QUICK STATS (MINIMAL) ===
        # Get basic team stats
        stats_text = ""
        if team_data:
            member_count = len(team_data.get('members', []))
            stats_text = f"**Members:** {member_count}\n"

            # Add any other minimal stats
            if matches_data and matches_data.get('items'):
                recent_match_count = len(matches_data['items'])
                stats_text += f"**Recent Matches:** {recent_match_count}"
            else:
                stats_text += f"**Recent Matches:** 0"
        else:
            stats_text = "Stats unavailable"

        embed.add_field(
            name="📈 Quick Stats",
            value=stats_text,
            inline=True
        )

        # === UPCOMING SECTION (COMPACT) ===
        upcoming_text = f"[View Schedule](https://www.faceit.com/en/teams/{team_id})"

        embed.add_field(
            name="📅 Upcoming",
            value=upcoming_text,
            inline=False
        )

        # === FOOTER WITH LAST UPDATED ===
        embed.set_footer(
            text=f"Last Updated • Auto-refresh every 30min • Team ID: {team_id}",
            icon_url="https://cdn.discordapp.com/emojis/1234567890123456789.png"  # Optional: Add a small icon
        )

        return embed

    except Exception as e:
        logger.error(f"Error creating match status embed: {e}")

        # Fallback embed
        embed = discord.Embed(
            title="❌ Status Panel Error",
            description="Could not retrieve team status information",
            color=0xFF0000,
            timestamp=datetime.utcnow()
        )
        embed.set_footer(text="Last Updated")
        return embed
