Feature: DataPipeline
  A comprehensive data processing pipeline that transforms raw user activity
  records into actionable analytics summaries.

  Background:
    Given import lodash as _
    And constant ACTIVITY_THRESHOLD = 10
    And constant PREMIUM_MULTIPLIER = 1.5

  # ============================================================================
  # STEP 1: Parse raw activity strings into structured objects
  # ============================================================================
  
  Scenario: parse_activity defines a function
    Given function parse_activity accepts raw_string as String
    When let parts = raw_string.split(',')
    And let activity = {
      userId: parts[0],
      action: parts[1],
      timestamp: new Date(parts[2]),
      duration: parseInt(parts[3], 10),
      metadata: parts[4] || null
    }
    Then return activity

  # ============================================================================
  # STEP 2: Validate activities (remove malformed entries)
  # ============================================================================

  Scenario: is_valid_activity defines a function
    Given function is_valid_activity accepts activity as Object
    When let has_user = activity.userId && activity.userId.length > 0
    And let has_action = activity.action && activity.action.length > 0
    And let has_valid_duration = !isNaN(activity.duration) && activity.duration >= 0
    And let is_valid = has_user && has_action && has_valid_duration
    Then return is_valid

  Scenario: filter_valid_activities defines a function
    Given function filter_valid_activities accepts activities as Array
    When filter activities where is_valid_activity(item)
    Then return result

  # ============================================================================
  # STEP 3: Enrich activities with computed fields
  # ============================================================================

  Scenario: calculate_engagement_score defines a function
    Given function calculate_engagement_score accepts activity as Object
    When let base_score = activity.duration * 0.1
    And let action_multiplier = activity.action matches
      | 'purchase'  | 3.0 |
      | 'share'     | 2.5 |
      | 'comment'   | 2.0 |
      | 'like'      | 1.5 |
      | 'view'      | 1.0 |
      | _           | 0.5 |
    And let score = base_score * action_multiplier
    Then return Math.round(score * 100) / 100

  Scenario: enrich_activity defines a function
    Given function enrich_activity accepts activity as Object
    When let engagement_score = calculate_engagement_score(activity)
    And let day_of_week = activity.timestamp.getDay()
    And let is_weekend = day_of_week === 0 || day_of_week === 6
    And let hour = activity.timestamp.getHours()
    And let time_category = hour matches
      | hour < 6   | 'night'     |
      | hour < 12  | 'morning'   |
      | hour < 18  | 'afternoon' |
      | _          | 'evening'   |
    And let enriched = {
      ...activity,
      engagementScore: engagement_score,
      isWeekend: is_weekend,
      timeCategory: time_category
    }
    Then return enriched

  Scenario: enrich_all_activities defines a function
    Given function enrich_all_activities accepts activities as Array
    When map activities to enrich_activity(item)
    Then return result

  # ============================================================================
  # STEP 4: Aggregate by user
  # ============================================================================

  Scenario: aggregate_by_user defines a function
    Given function aggregate_by_user accepts activities as Array
    When group activities by userId
    And let user_summaries = Object.entries(result).map(([userId, userActivities]) => ({
      userId: userId,
      totalActivities: userActivities.length,
      totalDuration: userActivities.reduce((sum, a) => sum + a.duration, 0),
      totalEngagement: userActivities.reduce((sum, a) => sum + a.engagementScore, 0),
      averageEngagement: userActivities.reduce((sum, a) => sum + a.engagementScore, 0) / userActivities.length,
      actions: [...new Set(userActivities.map(a => a.action))],
      weekendActivity: userActivities.filter(a => a.isWeekend).length,
      weekdayActivity: userActivities.filter(a => !a.isWeekend).length
    }))
    Then return user_summaries

  # ============================================================================
  # STEP 5: Classify users based on engagement
  # ============================================================================

  Scenario: classify_user_engagement defines a function
    Given function classify_user_engagement accepts user_summary as Object
    When let avg = user_summary.averageEngagement
    And let classification = avg matches
      | avg >= 20  | 'highly_engaged'    |
      | avg >= 10  | 'moderately_engaged'|
      | avg >= 5   | 'lightly_engaged'   |
      | _          | 'inactive'          |
    And let classified = {
      ...user_summary,
      engagementTier: classification,
      isHighValue: avg >= ACTIVITY_THRESHOLD
    }
    Then return classified

  Scenario: classify_all_users defines a function
    Given function classify_all_users accepts user_summaries as Array
    When map user_summaries to classify_user_engagement(item)
    Then return result

  # ============================================================================
  # STEP 6: Sort and rank users
  # ============================================================================

  Scenario: rank_users defines a function
    Given function rank_users accepts classified_users as Array
    When sort classified_users by totalEngagement descending
    And let ranked = result.map((user, index) => ({
      ...user,
      rank: index + 1,
      percentile: Math.round(((classified_users.length - index) / classified_users.length) * 100)
    }))
    Then return ranked

  # ============================================================================
  # STEP 7: Generate final analytics report
  # ============================================================================

  Scenario: generate_report_summary defines a function
    Given function generate_report_summary accepts ranked_users as Array
    When let total_users = ranked_users.length
    And let highly_engaged_count = ranked_users.filter(u => u.engagementTier === 'highly_engaged').length
    And let moderately_engaged_count = ranked_users.filter(u => u.engagementTier === 'moderately_engaged').length
    And let total_engagement = ranked_users.reduce((sum, u) => sum + u.totalEngagement, 0)
    And let total_duration = ranked_users.reduce((sum, u) => sum + u.totalDuration, 0)
    And let report = {
      summary: {
        totalUsers: total_users,
        totalEngagementScore: Math.round(total_engagement * 100) / 100,
        totalActivityDuration: total_duration,
        averageEngagementPerUser: Math.round((total_engagement / total_users) * 100) / 100
      },
      distribution: {
        highlyEngaged: highly_engaged_count,
        moderatelyEngaged: moderately_engaged_count,
        lightlyEngaged: ranked_users.filter(u => u.engagementTier === 'lightly_engaged').length,
        inactive: ranked_users.filter(u => u.engagementTier === 'inactive').length
      },
      topPerformers: ranked_users.slice(0, 5).map(u => ({
        userId: u.userId,
        rank: u.rank,
        engagementScore: u.totalEngagement,
        tier: u.engagementTier
      })),
      users: ranked_users,
      generatedAt: new Date().toISOString()
    }
    Then return report

  # ============================================================================
  # MASTER PIPELINE: Compose all functions into a single data flow
  # ============================================================================

  Scenario: process_raw_activity_data defines a function
    Given function process_raw_activity_data accepts raw_strings as Array
    # Parse all raw strings into activity objects
    When map raw_strings to parse_activity(item)
    And store result as parsed_activities
    # Filter out invalid entries
    When pipe parsed_activities through
      | filter_valid_activities |
      | enrich_all_activities   |
      | aggregate_by_user       |
      | classify_all_users      |
      | rank_users              |
      | generate_report_summary |
    Then return result

  # ============================================================================
  # ALTERNATIVE PIPELINE: Step-by-step for debugging/logging
  # ============================================================================

  Scenario: process_with_stages defines a function
    Given function process_with_stages accepts raw_strings as Array
    # Stage 1: Parse
    When map raw_strings to parse_activity(item)
    And store result as stage_1_parsed
    
    # Stage 2: Validate
    When call filter_valid_activities with stage_1_parsed storing result as stage_2_validated
    
    # Stage 3: Enrich
    When call enrich_all_activities with stage_2_validated storing result as stage_3_enriched
    
    # Stage 4: Aggregate
    When call aggregate_by_user with stage_3_enriched storing result as stage_4_aggregated
    
    # Stage 5: Classify
    When call classify_all_users with stage_4_aggregated storing result as stage_5_classified
    
    # Stage 6: Rank
    When call rank_users with stage_5_classified storing result as stage_6_ranked
    
    # Stage 7: Report
    When call generate_report_summary with stage_6_ranked storing result as final_report
    
    # Return with stage metadata for debugging
    And let result_with_metadata = {
      ...final_report,
      _pipeline: {
        inputCount: raw_strings.length,
        parsedCount: stage_1_parsed.length,
        validCount: stage_2_validated.length,
        enrichedCount: stage_3_enriched.length,
        aggregatedCount: stage_4_aggregated.length,
        stages: ['parse', 'validate', 'enrich', 'aggregate', 'classify', 'rank', 'report']
      }
    }
    Then return result_with_metadata

  # ============================================================================
  # UTILITY: Filter pipeline results by engagement tier
  # ============================================================================

  Scenario: get_users_by_tier defines a function
    Given function get_users_by_tier accepts report as Object and tier as String
    When filter report.users where item.engagementTier === tier
    Then return result

  Scenario: get_high_value_users defines a function
    Given function get_high_value_users accepts report as Object
    When filter report.users where item.isHighValue === true
    Then return result
