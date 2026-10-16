'use strict';

const { QueryTypes } = require('sequelize');

async function queryOne(db, sql, replacements, transaction) {
  const rows = await db.query(sql, { replacements, type: QueryTypes.SELECT, transaction });
  return rows[0] || null;
}

async function insertReturning(db, sql, replacements, transaction) {
  const [result] = await db.query(sql, { replacements, transaction });
  return Array.isArray(result) ? result[0] || null : result;
}

async function ensureUser(transaction, db, account) {
  const existing = await queryOne(db, 'SELECT user_id FROM users WHERE school_id = :school_id', {
    school_id: account.schoolId,
  }, transaction);
  if (existing) return existing.user_id;

  const row = await insertReturning(db, `INSERT INTO users (school_id, full_name, email, role, created_at) VALUES (:school_id, :full_name, :email, :role, :created_at) ON CONFLICT (school_id) DO NOTHING RETURNING user_id`, {
    school_id: account.schoolId,
    full_name: account.fullName,
    email: account.email,
    role: account.role,
    created_at: new Date('2027-01-05T00:00:00.000Z'),
  }, transaction);

  return row ? row.user_id : (await queryOne(db, 'SELECT user_id FROM users WHERE school_id = :school_id', { school_id: account.schoolId }, transaction)).user_id;
}

async function upsertChoice(transaction, db, questionId, choiceIndex, text) {
  const row = await insertReturning(db, `INSERT INTO choices (question_id, choice_index, text) VALUES (:question_id, :choice_index, :text) ON CONFLICT (question_id, choice_index) DO UPDATE SET text = EXCLUDED.text RETURNING choice_id`, { question_id: questionId, choice_index: choiceIndex, text }, transaction);
  if (row) return row.choice_id;
  const existing = await queryOne(db, 'SELECT choice_id FROM choices WHERE question_id = :question_id AND choice_index = :choice_index', { question_id: questionId, choice_index: choiceIndex }, transaction);
  return existing.choice_id;
}

async function ensureOccurrence(transaction, db, details) {
  const existing = await queryOne(db, 'SELECT occurrence_id FROM session_question_history WHERE session_id = :session_id AND cycle_number = :cycle_number AND question_id = :question_id', { session_id: details.sessionId, cycle_number: details.cycleNumber, question_id: details.questionId }, transaction);
  if (existing) return existing.occurrence_id;

  const row = await insertReturning(db, `INSERT INTO session_question_history (session_id, cycle_number, question_id, displayed_at) VALUES (:session_id, :cycle_number, :question_id, :displayed_at) ON CONFLICT (session_id, cycle_number, question_id) DO NOTHING RETURNING occurrence_id`, {
    session_id: details.sessionId,
    cycle_number: details.cycleNumber,
    question_id: details.questionId,
    displayed_at: details.displayedAt,
  }, transaction);

  if (row) return row.occurrence_id;
  const current = await queryOne(db, 'SELECT occurrence_id FROM session_question_history WHERE session_id = :session_id AND cycle_number = :cycle_number AND question_id = :question_id', { session_id: details.sessionId, cycle_number: details.cycleNumber, question_id: details.questionId }, transaction);
  return current.occurrence_id;
}

module.exports = {
  async up(queryInterface) {
    const db = queryInterface.sequelize;
    const account = (schoolId, fullName, email, role) => ({ schoolId, fullName, email, role });


    const transaction = await db.transaction();
    try {
      const hostId = await ensureUser(transaction, db, account('2099-0001', 'Host Librarian', 'host@bombpass.test', 'HOST'));
      const adminId = await ensureUser(transaction, db, account('2099-0002', 'Library Administrator', 'admin@bombpass.test', 'ADMIN'));

      const finishedPlayers = [
        { schoolId: '2099-1001', fullName: 'Player Rina', email: 'rina.player@bombpass.test', nickname: 'Rina', score: 40 },
        { schoolId: '2099-1002', fullName: 'Player Dale', email: 'dale.player@bombpass.test', nickname: 'Dale', score: 30 },
        { schoolId: '2099-1003', fullName: 'Player Pao', email: 'pao.player@bombpass.test', nickname: 'Pao', score: 30 },
        { schoolId: '2099-1004', fullName: 'Player Lia', email: 'lia.player@bombpass.test', nickname: 'Lia', score: 20 },
        { schoolId: '2099-1005', fullName: 'Player Ben', email: 'ben.player@bombpass.test', nickname: 'Ben', score: 10 },
      ];

      for (const player of finishedPlayers) await ensureUser(transaction, db, account(player.schoolId, player.fullName, player.email, 'PLAYER'));

      const runningPlayers = [
        { schoolId: '2099-1009', fullName: 'Player Alex', email: 'alex.player@bombpass.test', nickname: 'Alex' },
        { schoolId: '2099-1010', fullName: 'Player River', email: 'river.player@bombpass.test', nickname: 'River' },
        { schoolId: '2099-1011', fullName: 'Player Sam', email: 'sam.player@bombpass.test', nickname: 'Sam' },
      ];

      for (const player of runningPlayers) await ensureUser(transaction, db, account(player.schoolId, player.fullName, player.email, 'PLAYER'));
      const nonjoinId = await ensureUser(transaction, db, account('2099-2001', 'Player Nonjoin', 'nonjoin@bombpass.test', 'PLAYER'));
      const runningUserRows = [];
      for (const player of runningPlayers) {
        const row = await queryOne(db, "SELECT user_id, school_id FROM users WHERE school_id = :school_id", { school_id: player.schoolId }, transaction);
        runningUserRows.push(row);
      }
      const runningUserBySchool = Object.fromEntries(runningUserRows.map(row => [row.school_id, row.user_id]));
      const runningUserIds = runningPlayers.map(player => runningUserBySchool[player.schoolId]);

      const questionSet = await queryOne(db, "SELECT question_set_id FROM question_sets WHERE owner_user_id = :owner_user_id AND title = :title", { owner_user_id: hostId, title: 'Bomb Pass Seed Question Set' }, transaction);
      let questionSetId = questionSet ? questionSet.question_set_id : null;

      if (!questionSetId) {
        const insertedQuestionSet = await insertReturning(db, `INSERT INTO question_sets (owner_user_id, title, description, subject, grade_level) VALUES (:owner_user_id, :title, :description, :subject, :grade_level) RETURNING question_set_id`, {
          owner_user_id: hostId,
          title: 'Bomb Pass Seed Question Set',
          description: 'Fictitious multiple-choice questions used for Bomb Pass Week 10 seed data.',
          subject: 'Computer Science',
          grade_level: 'College',
        }, transaction);
        questionSetId = insertedQuestionSet ? insertedQuestionSet.question_set_id : null;
      }

      if (!questionSetId) {
        questionSetId = (await queryOne(db, "SELECT question_set_id FROM question_sets WHERE owner_user_id = :owner_user_id AND title = :title", { owner_user_id: hostId, title: 'Bomb Pass Seed Question Set' }, transaction)).question_set_id;
      }

      const questionData = [
        { text: 'What kinds of questions may a Bomb Pass session use?', correctIndex: 0, timeLimit: 15, choices: ['Multiple-choice questions only', 'True/false questions only', 'Essay questions', 'Any Rule 3 question type'] },
        { text: 'How many choices should a Bomb Pass multiple-choice question have?', correctIndex: 2, timeLimit: 15, choices: ['Exactly 2', 'Exactly 4', '2 to 4', 'Any number of choices'] },
        { text: "Which answer status is stored when a player misses the answer deadline?", correctIndex: 0, timeLimit: 15, choices: ['TIMEOUT', 'CORRECT', 'INCORRECT', 'PENDING'] },
        { text: 'Which field identifies the current bomb holder?', correctIndex: 2, timeLimit: 15, choices: ['winner_player_id', 'host_user_id', 'bomb_holder_player_id', 'session_id'] },
      ];

      const findOrInsertQuestion = async (question) => {
        let existing = await queryOne(db, 'SELECT question_id FROM questions WHERE question_set_id = :question_set_id AND text = :text', {
          question_set_id: questionSetId,
          text: question.text,
        }, transaction);
        if (existing) return existing.question_id;

        const row = await insertReturning(db, `INSERT INTO questions (question_set_id, text, type, correct_index, time_limit_seconds) VALUES (:question_set_id, :text, :type, :correct_index, :time_limit_seconds) RETURNING question_id`, {
          question_set_id: questionSetId,
          text: question.text,
          type: 'multiple_choice',
          correct_index: question.correctIndex,
          time_limit_seconds: question.timeLimit,
        }, transaction);
        return row.question_id;
      };

      const questionIds = [];
      for (const question of questionData) {
        const questionId = await findOrInsertQuestion(question);
        questionIds.push(questionId);
        const choices = (await db.query(
          'SELECT COUNT(*)::int AS count FROM choices WHERE question_id = :question_id',
          { replacements: { question_id: questionId }, type: QueryTypes.SELECT, transaction }
        ))[0].count;

        for (let choiceIndex = 0; choiceIndex < question.choices.length; choiceIndex++) {
          await upsertChoice(transaction, db, questionId, choiceIndex, question.choices[choiceIndex]);
        }
      }

      if (questionIds.length < 4) {
        throw new Error('Cannot seed answers without all four stored questions');
      }

      const finishedStartedAt = new Date('2026-10-09T01:00:00.000Z');
      const finishedEndedAt = new Date('2026-10-09T01:12:00.000Z');

      let finishedSession = await queryOne(db, 'SELECT session_id FROM game_sessions WHERE join_code = :join_code', { join_code: '418263' }, transaction);
      if (!finishedSession) {
        await insertReturning(db, `INSERT INTO game_sessions (host_user_id, question_set_id, join_code, status, duration_limit_minutes, bomb_time_limit_seconds, current_cycle_number, created_at) VALUES (:host_user_id, :question_set_id, :join_code, :status, :duration_limit_minutes, :bomb_time_limit_seconds, :current_cycle_number, :created_at) RETURNING session_id`, {
          host_user_id: hostId,
          question_set_id: questionSetId,
          join_code: '418263',
          status: 'ended',
          duration_limit_minutes: 10,
          bomb_time_limit_seconds: 30,
          current_cycle_number: 1,
          created_at: finishedStartedAt,
        }, transaction);
        finishedSession = await queryOne(db, 'SELECT session_id FROM game_sessions WHERE join_code = :join_code', { join_code: '418263' }, transaction);
      }
      const finishedSessionId = finishedSession.session_id;

      await db.query(`UPDATE game_sessions SET started_at = :started_at, ended_at = :ended_at, session_end_reason = :session_end_reason, current_question_id = :current_question_id WHERE session_id = :session_id`, {
        replacements: {
          started_at: finishedStartedAt,
          ended_at: finishedEndedAt,
          session_end_reason: 'last_player',
          current_question_id: questionIds[3],
          session_id: finishedSessionId,
        },
        transaction,
      });

      const finishedUserMap = Object.fromEntries(await Promise.all(finishedPlayers.map(async (player) => {
        const user = await queryOne(db, 'SELECT user_id FROM users WHERE school_id = :school_id', { school_id: player.schoolId }, transaction);
        return [player.nickname, user.user_id];
      })));

      const finishedPlayerSeeds = [
        { nickname: 'Rina', score: 40, rank: 1, connectionStatus: 'CONNECTED', forfeited: false },
        { nickname: 'Dale', score: 30, rank: 2, connectionStatus: 'CONNECTED', forfeited: false },
        { nickname: 'Pao', score: 30, rank: 3, connectionStatus: 'CONNECTED', forfeited: false },
        { nickname: 'Lia', score: 20, rank: 4, connectionStatus: 'CONNECTED', forfeited: false },
        { nickname: 'Ben', score: 10, rank: 5, connectionStatus: 'DISCONNECTED', forfeited: true },
      ];

      for (const seed of finishedPlayerSeeds) {
        const userId = finishedUserMap[seed.nickname];
        await db.query(`INSERT INTO players (session_id, user_id, nickname, score, player_status, connection_status, joined_at, last_seen_at, disconnected_at, eliminated_at, forfeited_at, finished_at, final_rank) VALUES (:session_id, :user_id, :nickname, :score, :player_status, :connection_status, :joined_at, :last_seen_at, :disconnected_at, :eliminated_at, :forfeited_at, :finished_at, :final_rank) ON CONFLICT (session_id, user_id) DO NOTHING`, {
          replacements: {
            session_id: finishedSessionId,
            user_id: userId,
            nickname: seed.nickname,
            score: seed.score,
            player_status: seed.forfeited ? 'FORFEITED' : 'FINISHED',
            connection_status: seed.connectionStatus,
            joined_at: finishedStartedAt,
            last_seen_at: seed.connectionStatus === 'DISCONNECTED' ? new Date('2026-10-09T01:08:00.000Z') : finishedEndedAt,
            disconnected_at: seed.connectionStatus === 'DISCONNECTED' ? new Date('2026-10-09T01:10:00.000Z') : null,
            eliminated_at: null,
            forfeited_at: seed.forfeited ? new Date('2026-10-09T01:09:00.000Z') : null,
            finished_at: seed.forfeited ? null : finishedEndedAt,
            final_rank: seed.rank,
          },
          transaction,
        });
      }

      const allFinishedPlayers = await db.query('SELECT player_id, nickname FROM players WHERE session_id = :session_id ORDER BY player_id', { replacements: { session_id: finishedSessionId }, type: QueryTypes.SELECT, transaction });
      const playerByNickname = Object.fromEntries(allFinishedPlayers.map(row => [row.nickname, row.player_id]));

      const occurrences = [];
      for (let index = 0; index < questionIds.length; index++) {
        const occurrenceId = await ensureOccurrence(transaction, db, {
          sessionId: finishedSessionId,
          cycleNumber: 1,
          questionId: questionIds[index],
          displayedAt: new Date(finishedStartedAt.getTime() + (index * 20000)),
        });
        occurrences.push(occurrenceId);
      }
      const answerSpecs = [
        { nickname: 'Rina', answerStatuses: ['CORRECT', 'CORRECT', 'CORRECT', 'CORRECT'], choices: [0, 1, 0, 2], elapsedMs: [1000, 1200, 900, 1500] },
        { nickname: 'Dale', answerStatuses: ['CORRECT', 'INCORRECT', 'CORRECT', 'CORRECT'], choices: [0, 0, 0, 2], elapsedMs: [2000, 1600, 1400, 1700] },
        { nickname: 'Pao', answerStatuses: ['CORRECT', 'INCORRECT', 'CORRECT', 'CORRECT'], choices: [0, 2, 0, 2], elapsedMs: [1800, 1700, 1500, 1600] },
        { nickname: 'Lia', answerStatuses: ['CORRECT', 'CORRECT', 'CORRECT', 'TIMEOUT'], choices: [0, 1, 0, null], elapsedMs: [2000, 2000, 2200, 15000] },
        { nickname: 'Ben', answerStatuses: ['CORRECT', 'INCORRECT', 'INCORRECT', 'TIMEOUT'], choices: [0, 1, 0, null], elapsedMs: [2200, 1900, 2000, 15000] },
      ];

      for (const specification of answerSpecs) {
        for (let questionIndex = 0; questionIndex < questionIds.length; questionIndex++) {
          const status = specification.answerStatuses[questionIndex];
          const selectedChoice = status === 'TIMEOUT' ? null : specification.choices[questionIndex];
          const questionId = questionIds[questionIndex];

          if (selectedChoice !== null) {
            const choices = await db.query('SELECT choice_id FROM choices WHERE question_id = :question_id and choice_index = :choice_index', { replacements: { question_id: questionId, choice_index: selectedChoice }, type: QueryTypes.SELECT, transaction });
            const choiceId = choices[0].choice_id;
            await db.query(`INSERT INTO answers (player_id, occurrence_id, choice_id, answer_status, elapsed_ms, submitted_at) VALUES (:player_id, :occurrence_id, :choice_id, :answer_status, :elapsed_ms, :submitted_at) ON CONFLICT (player_id, occurrence_id) DO NOTHING`, {
              replacements: {
                player_id: playerByNickname[specification.nickname],
                occurrence_id: occurrences[questionIndex],
                choice_id: choiceId,
                answer_status: status,
                elapsed_ms: specification.elapsedMs[questionIndex],
                submitted_at: new Date(finishedStartedAt.getTime() + ((questionIndex * 20000) + specification.elapsedMs[questionIndex])),
              },
              transaction,
            });
          } else {
            await db.query(`INSERT INTO answers (player_id, occurrence_id, choice_id, answer_status, elapsed_ms, submitted_at) VALUES (:player_id, :occurrence_id, NULL, 'TIMEOUT', :elapsed_ms, :submitted_at) ON CONFLICT (player_id, occurrence_id) DO NOTHING`, {
              replacements: {
                player_id: playerByNickname[specification.nickname],
                occurrence_id: occurrences[questionIndex],
                elapsed_ms: specification.elapsedMs[questionIndex],
                submitted_at: new Date(finishedStartedAt.getTime() + ((questionIndex * 20000) + 15000)),
              },
              transaction,
            });
          }
        }
      }

      const benId = playerByNickname.Ben;
      const penaltyRow = await queryOne(db, "SELECT penalty_id FROM penalties WHERE player_id = :player_id AND reason = 'bomb_expiration'", { player_id: benId }, transaction);
      if (!penaltyRow) {
        await db.query(`INSERT INTO penalties (player_id, reason, created_at) VALUES (:player_id, 'bomb_expiration', :created_at)`, {
          replacements: {
            player_id: benId,
            created_at: new Date('2026-10-09T01:05:00.000Z'),
          },
          transaction,
        });
      }

      const rinaId = playerByNickname.Rina;
      const rinaUser = await queryOne(db, 'SELECT user_id FROM users WHERE school_id = :school_id', { school_id: '2099-1001' }, transaction);
      const expRows = await db.query('SELECT exp_transaction_id FROM exp_transactions WHERE user_id = $1::int AND session_id = $2::int AND reason = $3', { bind: [rinaUser.user_id, finishedSessionId, 'SESSION_COMPLETION'], type: QueryTypes.SELECT, transaction });
      const expRow = expRows[0] || null;

      if (!expRow) {
        const row = await insertReturning(db, `INSERT INTO exp_transactions (user_id, session_id, amount, reason) VALUES (:user_id, :session_id, :amount, :reason) RETURNING exp_transaction_id`, {
          user_id: rinaUser.user_id,
          session_id: finishedSessionId,
          amount: 5,
          reason: 'SESSION_COMPLETION',
        }, transaction);
        if (!row) throw new Error('Could not insert the sample completion EXP row');
      }

      await db.query(`UPDATE game_sessions SET bomb_holder_player_id = :player_id, winner_player_id = :player_id, current_question_id = :question_id WHERE session_id = :session_id`, {
        replacements: {
          player_id: rinaId,
          question_id: questionIds[3],
          session_id: finishedSessionId,
        },
        transaction,
      });

      const now = Date.UTC(2027, 0, 5, 0, 0, 0);
      const runningStartedAt = new Date(now);
      const runningQuestionExpiresAt = new Date(now + (15 * 1000));
      const runningBombExpiresAt = new Date(now + (30 * 1000));

      let runningSession = await queryOne(db, 'SELECT session_id FROM game_sessions WHERE join_code = :join_code', { join_code: '723091' }, transaction);
      if (!runningSession) {
        await insertReturning(db, `INSERT INTO game_sessions (host_user_id, question_set_id, join_code, status, duration_limit_minutes, bomb_time_limit_seconds, bomb_holder_player_id, bomb_expires_at, current_cycle_number, started_at, created_at) VALUES (:host_user_id, :question_set_id, :join_code, :status, :duration_limit_minutes, :bomb_time_limit_seconds, :bomb_holder_player_id, :bomb_expires_at, :current_cycle_number, :started_at, :created_at) RETURNING session_id`, {
          host_user_id: hostId,
          question_set_id: questionSetId,
          join_code: '723091',
          status: 'playing',
          duration_limit_minutes: 10,
          bomb_time_limit_seconds: 30,
          bomb_holder_player_id: null,
          bomb_expires_at: runningBombExpiresAt,
          current_cycle_number: 1,
          started_at: runningStartedAt,
          created_at: runningStartedAt,
        }, transaction);
        runningSession = await queryOne(db, 'SELECT session_id FROM game_sessions WHERE join_code = :join_code', { join_code: '723091' }, transaction);
      }
      const runningSessionId = runningSession.session_id;

      const runningNicknames = ['Alex', 'River', 'Sam'];
      for (let index = 0; index < runningUserIds.length; index++) {
        const userId = runningUserIds[index];
        if (!userId) {
          throw new Error('Running player seed data is expected to exist');
        }

        await db.query(`INSERT INTO players (session_id, user_id, nickname, score, player_status, connection_status, joined_at, last_seen_at, disconnected_at, eliminated_at, forfeited_at, finished_at, final_rank) VALUES (:session_id, :user_id, :nickname, :score, :player_status, :connection_status, :joined_at, :last_seen_at, :disconnected_at, :eliminated_at, :forfeited_at, :finished_at, :final_rank) ON CONFLICT (session_id, user_id) DO NOTHING`, {
          replacements: {
            session_id: runningSessionId,
            user_id: userId,
            nickname: runningNicknames[index],
            score: 0,
            player_status: 'ACTIVE',
            connection_status: index === 1 ? 'DISCONNECTED' : 'CONNECTED',
            joined_at: runningStartedAt,
            last_seen_at: index === 1 ? new Date(now - (20 * 1000)) : runningStartedAt,
            disconnected_at: index === 1 ? new Date(now - (20 * 1000)) : null,
            eliminated_at: null,
            forfeited_at: null,
            finished_at: null,
            final_rank: null,
          },
          transaction,
        });
      }

      const runningPlayerRows = await db.query('SELECT player_id FROM players WHERE session_id = :session_id ORDER BY user_id', { replacements: { session_id: runningSessionId }, type: QueryTypes.SELECT, transaction });
      const bombHolderId = runningPlayerRows[0].player_id;
      await db.query(`UPDATE players SET score = CASE user_id WHEN :d_user THEN 10 ELSE 0 END WHERE session_id = :session_id`, {
        replacements: {
          d_user: runningUserIds[1],
          session_id: runningSessionId,
        },
        transaction,
      });

      const runningHistoryId = await ensureOccurrence(transaction, db, {
        sessionId: runningSessionId,
        cycleNumber: 1,
        questionId: questionIds[0],
        displayedAt: runningStartedAt,
      });

      const runningAnsweringPlayer = await queryOne(db, 'SELECT player_id FROM players WHERE session_id = :session_id AND user_id = :user_id', { session_id: runningSessionId, user_id: runningUserIds[1] }, transaction);
      await db.query(`INSERT INTO answers (player_id, occurrence_id, choice_id, answer_status, elapsed_ms, submitted_at) VALUES (:player_id, :occurrence_id, :choice_id, :answer_status, :elapsed_ms, :submitted_at) ON CONFLICT (player_id, occurrence_id) DO NOTHING`, {
        replacements: {
          player_id: runningAnsweringPlayer.player_id,
          occurrence_id: runningHistoryId,
          choice_id: (await db.query('SELECT choice_id FROM choices WHERE question_id = :question_id AND choice_index = 0', { replacements: { question_id: questionIds[0] }, type: QueryTypes.SELECT, transaction }))[0].choice_id,
          answer_status: 'CORRECT',
          elapsed_ms: 1200,
          submitted_at: runningStartedAt,
        },
        transaction,
      });

      await db.query(`UPDATE game_sessions SET bomb_holder_player_id = :bomb_holder_player_id, current_question_id = :current_question_id, current_cycle_number = :current_cycle_number, bomb_expires_at = :bomb_expires_at, winner_player_id = NULL, question_expires_at = :question_expires_at WHERE session_id = :session_id`, {
        replacements: {
          bomb_holder_player_id: bombHolderId,
          current_question_id: questionIds[0],
          current_cycle_number: 1,
          bomb_expires_at: runningBombExpiresAt,
          question_expires_at: runningQuestionExpiresAt,
          session_id: runningSessionId,
        },
        transaction,
      });

      const hostUser = await queryOne(db, 'SELECT user_id FROM users WHERE school_id = :school_id', { school_id: '2099-0001' }, transaction);
      const inactiveVoucher = await queryOne(db, "SELECT voucher_id FROM voucher_catalog WHERE name = :name", { name: 'Bomb Pass Inactive Seed Voucher' }, transaction);
      if (!inactiveVoucher) {
        await insertReturning(db, `INSERT INTO voucher_catalog (created_by, name, description, exp_cost, stock_limit, is_active) VALUES (:created_by, :name, :description, :exp_cost, :stock_limit, :is_active) RETURNING voucher_id`, {
          created_by: adminId,
          name: 'Bomb Pass Inactive Seed Voucher',
          description: 'A library-governed voucher that remains inactive until approval.',
          exp_cost: 100,
          stock_limit: 10,
          is_active: false,
        }, transaction);
      }

      const activeVoucher = await queryOne(db, "SELECT voucher_id FROM voucher_catalog WHERE name = :name", { name: 'Bomb Pass Study Voucher' }, transaction);
      let activeVoucherId = activeVoucher ? activeVoucher.voucher_id : null;
      if (!activeVoucherId) {
        const row = await insertReturning(db, `INSERT INTO voucher_catalog (created_by, name, description, exp_cost, stock_limit, is_active) VALUES (:created_by, :name, :description, :exp_cost, :stock_limit, :is_active) RETURNING voucher_id`, {
          created_by: adminId,
          name: 'Bomb Pass Study Voucher',
          description: 'A fictitious low-cost voucher for repeatable seed redemption tests.',
          exp_cost: 100,
          stock_limit: 10,
          is_active: true,
        }, transaction);
        activeVoucherId = row.voucher_id;
      }

      const pendingUser = await queryOne(db, 'SELECT user_id FROM users WHERE school_id = :school_id', { school_id: '2099-1005' }, transaction);
      const pending = await queryOne(db, "SELECT redemption_id FROM voucher_redemptions WHERE user_id = :user_id AND voucher_id = :voucher_id AND status = 'PENDING'", {
        user_id: pendingUser.user_id,
        voucher_id: activeVoucherId,
      }, transaction);

      if (!pending) {
        await db.query(`INSERT INTO voucher_redemptions (user_id, voucher_id, exp_cost_snapshot, status) VALUES (:user_id, :voucher_id, :exp_cost_snapshot, :status)`, {
          replacements: {
            user_id: pendingUser.user_id,
            voucher_id: activeVoucherId,
            exp_cost_snapshot: 100,
            status: 'PENDING',
          },
          transaction,
        });
      }

      await transaction.commit();
    } catch (error) {
      console.error('[SEED ERROR ATTACHED] ' + (error && error.original && error.original.toString()) || String(error));
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const db = queryInterface.sequelize;
    const accountSchoolIds = ['2099-0001','2099-0002','2099-1001','2099-1002','2099-1003','2099-1004','2099-1005','2099-1009','2099-1010','2099-1011','2099-2001'];
    const finishedCode = '418263';
    const runningCode = '723091';

    const users = await db.query('SELECT user_id FROM users WHERE school_id = ANY(:school_ids)', { replacements: { school_ids: accountSchoolIds }, type: QueryTypes.SELECT });
    const userIds = users.map(row => row.user_id);
    const questionSets = await db.query("SELECT question_set_id FROM question_sets WHERE title = :title", { replacements: { title: 'Bomb Pass Seed Question Set' }, type: QueryTypes.SELECT });
    const questionSetIds = questionSets.map(row => row.question_set_id);
    const questions = questionSetIds.length ? await db.query("SELECT question_id FROM questions WHERE question_set_id = ANY(:ids)", { replacements: { ids: questionSetIds }, type: QueryTypes.SELECT }) : [];
    const questionIds = questions.map(row => row.question_id);
    const sessions = await db.query("SELECT session_id FROM game_sessions WHERE join_code = ANY(:codes) OR owner_user_id = ANY(:user_ids)", { replacements: { codes: [finishedCode, runningCode], user_ids: [userIds[0]] }, type: QueryTypes.SELECT });
    const sessionIds = sessions.map(row => row.session_id);

    if (sessionIds.length) {
      const players = await db.query("SELECT player_id FROM players WHERE session_id = ANY(:session_ids)", { replacements: { session_ids: sessionIds }, type: QueryTypes.SELECT });
      const playerIds = players.map(row => row.player_id);
      if (playerIds.length) {
        await db.query("DELETE FROM answers WHERE player_id = ANY(:player_ids)", { replacements: { player_ids: playerIds } });
        await db.query("DELETE FROM penalties WHERE player_id = ANY(:player_ids)", { replacements: { player_ids: playerIds } });
        await db.query("DELETE FROM players WHERE player_id = ANY(:player_ids)", { replacements: { player_ids: playerIds } });
      }
      await db.query("DELETE FROM session_question_history WHERE session_id = ANY(:session_ids)", { replacements: { session_ids: sessionIds } });
      await db.query("DELETE FROM exp_transactions WHERE session_id = ANY(:session_ids)", { replacements: { session_ids: sessionIds } });
      await db.query("DELETE FROM game_sessions WHERE session_id = ANY(:session_ids)", { replacements: { session_ids: sessionIds } });
    }

    if (questionIds.length) {
      await db.query("DELETE FROM choices WHERE question_id = ANY(:question_ids)", { replacements: { question_ids: questionIds } });
      await db.query("DELETE FROM questions WHERE question_id = ANY(:question_ids)", { replacements: { question_ids: questionIds } });
    }
    if (questionSetIds.length) {
      await db.query("DELETE FROM question_sets WHERE question_set_id = ANY(:question_set_ids)", { replacements: { question_set_ids: questionSetIds } });
    }

    const pendingUser = await db.query("SELECT user_id FROM users WHERE school_id = '2099-1005'", { type: QueryTypes.SELECT });
    const activeVoucher = await db.query("SELECT voucher_id FROM voucher_catalog WHERE name = 'Bomb Pass Study Voucher'", { type: QueryTypes.SELECT });
    if (pendingUser.length && activeVoucher.length) {
      await db.query("DELETE FROM voucher_redemptions WHERE user_id = :user_id AND voucher_id = :voucher_id AND status = 'PENDING'", { replacements: { user_id: pendingUser[0].user_id, voucher_id: activeVoucher[0].voucher_id } });
    }
    await db.query("DELETE FROM voucher_catalog WHERE name IN ('Bomb Pass Study Voucher','Bomb Pass Inactive Seed Voucher')");

    await db.query("DELETE FROM users WHERE school_id = :school_id", { replacements: { school_id: '2099-2001' } });
    if (userIds.length) {
      await db.query("DELETE FROM users WHERE user_id = ANY(:user_ids)", { replacements: { user_ids: userIds } });
    }
  },
};
