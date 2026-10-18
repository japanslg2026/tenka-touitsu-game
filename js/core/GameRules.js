/**
 * js/core/GameRules.js - ゲームルール、合戦陣形、歴史イベント選択肢・分岐定義
 * 戦国天下統一伝 ES6モジュール
 */

export const HISTORICAL_CHOICE_EVENTS = [
{
        id: 'fujiwara_kiyohira_restoration',
        scenarioId: '*',
        year: 1087,
        title: '❖ 奥州藤原氏の黎明・清原清衡の復姓 ❖',
        subTitle: '後三年の役平定！清原の呪縛を断ち、父祖の藤原姓へ復姓',
        check: (game) => (game.year === 1088 || (game.year === 1087 && game.seasonIdx >= 3)) && (game.playerClanId === 'kiyohara' || game.playerClanId === 'minamoto_tsunemoto'),
        narrative: (game) => game.playerClanId === 'kiyohara'
          ? '寛治元年冬、出羽金沢柵が陥落し後三年の役は終結した。異父弟・家衡と叔父・武衡を討ち、奥羽六郡と出羽一円の実権を掌握した清衡。前九年の役で非業の最期を遂げた実父・藤原経清の無念と、連れ子として辛酸を舐めた清原一門の愛憎劇が胸に迫る。ここに養家の清原姓を捨てて父祖の「藤原」へと復姓し平泉に独自の仏国土・黄金平和王国を築くか、それとも出羽俘囚頭清原氏の武門を誇示し続けるか！'
          : '出羽金沢柵を攻め落とし、後三年の役を平定した源義家。共に戦い抜いた清原清衡は、実父・藤原経清の姓に復して「藤原清衡」と名乗り、奥州平泉の地に仏国土を拓くと伝えてきた。朝廷はこの戦いを私戦として義家に恩賞を出さない中、盟友・清衡の復姓と独立王国を承認するか、それとも源氏の武威のもとに奥羽への軍政を強めるか！',
        choices: (game) => game.playerClanId === 'kiyohara' ? [
          {
            text: '【史実ルート】父祖・藤原経清の志を継ぎ「藤原清衡」へ復姓！奥州藤原氏を興す！',
            desc: '「藤原清衡」へ改姓、勢力は「奥州藤原氏」へ！平泉黄金文化の礎を築き、金+2,000、米+2,500、全領国の治安・兵力向上！',
            isHistorical: true,
            action: (g) => {
              g.gold += 2000;
              g.rice += 2500;
              g.kiyohiraSurnameDeclined = false;
              g.kiyohiraFujiwaraAccepted = true;
              g.kanazawaOccurred = true;
              g.updateKiyohiraSurname(true);
              (g.provinces || []).filter(pr => pr.ownerId === 'kiyohara').forEach(pr => {
                pr.order = Math.min(100, (Number(pr.order) || 80) + 15);
                pr.troops += 1500;
              });
              g.log('👑【藤原復姓】清衡公は実父の姓に復して「藤原清衡」と名乗り、奥州藤原氏初代として平泉黄金文化の礎を築きました！', 'important');
              return '「これより我が家は奥州藤原氏なり！」中尊寺の建立を期し、平泉の地に百年の黄金平和王国を打ち立てました！';
            }
          },
          {
            text: '【歴史改変IF】清原の正嫡として「清原清衡」を堅持！出羽・陸奥の武門俘囚を束ねる！',
            desc: '清原氏の武威を誇示！出羽・奥州の荒武者を糾合し、全軍兵力+4,000、防衛力向上！',
            isHistorical: false,
            action: (g) => {
              g.kiyohiraSurnameDeclined = true;
              g.kiyohiraFujiwaraAccepted = false;
              g.updateKiyohiraSurname(false);
              (g.provinces || []).filter(pr => pr.ownerId === 'kiyohara').forEach(pr => {
                pr.troops += 2000;
                pr.defense = Math.min(100, (Number(pr.defense) || 60) + 15);
              });
              g.log('⚔️【清原武門の矜持】清原清衡公は清原の姓を保ち、出羽・陸奥の精強な武士団を率いて武威を示しました！', 'important');
              return '清原氏の棟梁として奥羽全土の武士を束ね、強大な武門政権としての威勢を天下に示しました！';
            }
          }
        ] : [
          {
            text: '【史実ルート】清衡の藤原復姓を承認し、固き盟約を結んで東国武士団の信を得る！',
            desc: '清衡が「藤原清衡」へ復姓！私財を投げ打って諸将に報いた義家の武名が東国に轟き、源氏兵力+3,500、金+1,000！',
            isHistorical: true,
            action: (g) => {
              g.gold += 1000;
              g.kiyohiraSurnameDeclined = false;
              g.kiyohiraFujiwaraAccepted = true;
              g.kanazawaOccurred = true;
              g.updateKiyohiraSurname(true);
              const p = g.provinces.find(pr => pr.ownerId === 'minamoto_tsunemoto') || g.provinces[0];
              if (p) p.troops += 3500;
              g.log('🤝【八幡太郎の武名】清原清衡の「藤原復姓」を承認！義家公の器量に東国武士団が心服しました！', 'important');
              return '清衡の藤原復姓を認め、奥羽との固い絆を締結！朝廷の恩賞なき中、義家公の私財による恩賞が武士の心を掴みました！';
            }
          },
          {
            text: '【歴史改変IF】奥羽の自立を許さず、鎮守府将軍として軍事的威圧を加え臣従を迫る！',
            desc: '河内源氏の覇権を奥羽全土へ及ぼす！陸奥・出羽の調達により米+3,000、清原領から兵糧貢納！',
            isHistorical: false,
            action: (g) => {
              g.rice += 3000;
              (g.provinces || []).filter(pr => pr.ownerId === 'minamoto_tsunemoto').forEach(pr => pr.troops += 2000);
              g.log('⚔️【源氏の奥羽軍政】鎮守府将軍の権威を掲げ、奥羽諸勢力に服属を迫りました！', 'important');
              return '清衡の独立を牽制し、源氏軍の圧倒的威圧のもとに奥羽の軍事物資を収奪・掌握しました！';
            }
          }
        ]
      },
{
        id: 'gunshi_join',
        scenarioId: '*',
        year: 1181,
        title: '❖ 稀代の名軍師・陣中に仕官を乞う ❖',
        subTitle: '「天下に覇を唱えんとする英主のもとで腕を振るいたし」',
        check: (game) => game.year >= (game.currentScenarioId === '1180' ? 1181 : 1561) && Math.random() < 0.01,
        narrative: (game) => '天下の噂を聞きつけ、稀代の兵法者にして智謀湧くが如き名軍師が、貴家の陣中を訪れてまいりました。「殿の掲げる大義に共鳴いたした。我が知謀、あるいは我が武勇の軍配、いかようにもお使いくだされ」と頭を垂れています。',
        choices: (game) => [
          {
            text: '【軍師・参謀として重用】軍政の改革と深謀遠慮の献策を命ず！',
            desc: '軍令権（行動力）の上限が永久に+1！さらに軍資金+600獲得！',
            isHistorical: true,
            action: (g) => {
              g.maxAp = Math.min(5, g.maxAp + 1);
              g.ap = g.maxAp;
              g.gold += 600;
              g.log('【名軍師の登用】卓越した献策により軍令権の上限が【' + g.maxAp + '】に増加しました！', 'important');
              return '名軍師の参謀就任により、軍政の効率が劇的に向上！毎季の行動力が強化されました！';
            }
          },
          {
            text: '【前線軍団長に抜擢】精鋭部隊の編成と敵陣突破の陣頭指揮を託す！',
            desc: '前線各城に精鋭兵士が集結！本拠地兵力+4,000、兵糧米+1,500！',
            isHistorical: false,
            action: (g) => {
              g.rice += 1500;
              const myProvs = g.provinces.filter(p => p.ownerId === g.playerClanId);
              if (myProvs.length > 0) myProvs[0].troops += 4000;
              g.log('【豪傑抜擢】名将の号令のもと、各地から屈強な精鋭武士4,000人が集結しました！', 'important');
              return '勇猛なる軍団長の檄により、精強無比な部隊が編成され戦力が大幅に向上しました！';
            }
          }
        ]
      },
{
        id: 'minatogawa',
        scenarioId: '*',
        year: 1336,
        title: '❖ 湊川の決戦・桜井の別れ ❖',
        subTitle: '建武の忠臣・楠木正成公が魅せる不朽の智勇',
        check: (game) => game.year === 1336 && (game.playerClanId === 'kusunoki' || game.playerClanId === 'ashikaga'),
        narrative: (game) => game.playerClanId === 'kusunoki'
          ? '九州から数十万の大船団を率いて東上する足利尊氏。楠木正成は後醍醐天皇に「一旦京都を空けて比叡山に退き、尊氏軍を市中でおびき寄せて挟撃すべし」と建策するも容れられず。桜井の宿で嫡男・正行に別れを告げた正成は、湊川で尊氏軍を迎え撃つか、あるいは独自に比叡山策を断行するか！'
          : '大船団を率いて兵庫沖へ迫る足利尊氏。立ちはだかるは智謀の化身・楠木正成。水陸二面作戦で新田義貞と楠木正成を分断撃破するか、正面突破で一気に上洛を果たすか！',
        choices: (game) => game.playerClanId === 'kusunoki' ? [
          {
            text: '【歴史改変IF】独自の判断で兵を退き、新田義貞とともに尊氏軍を包囲殲滅！',
            desc: '比叡山挟撃策の成就！尊氏軍を京都で分断包囲し、楠木軍兵力+6,000、大義名分確立！',
            isHistorical: false,
            action: (g) => {
              const p = g.provinces.find(pr => pr.ownerId === 'kusunoki') || g.provinces[0];
              p.troops += 6000;
              g.provinces.filter(pr => pr.ownerId === 'ashikaga').forEach(pr => pr.troops = Math.round(pr.troops * 0.5));
              g.log('【比叡山挟撃の快挙】楠木正成公の神算鬼謀により、足利尊氏の大軍を京都にて包囲壊滅！', 'important');
              return '正成公の智謀炸裂！尊氏軍を市中に誘い込んで退路を断ち、大勝利を収めました！';
            }
          },
          {
            text: '【史実ルート】湊川にて命を賭して迎え撃ち、武士の鑑として不朽の忠義を示す！',
            desc: '尊氏軍前衛に壊滅的打撃を与える。民百姓の熱狂的忠誠、米+3,000！',
            isHistorical: true,
            action: (g) => {
              g.rice += 3000;
              g.log('【湊川の忠烈】楠木正成公の奮戦により、敵主力部隊に壊滅的打撃を与えました！', 'important');
              return '七生報国の壮絶なる奮戦！敵将も兜を脱ぐほどの忠勇を示し、後世に名を刻みました！';
            }
          }
        ] : [
          {
            text: '【史実ルート】水陸二面作戦を敷き、新田軍と楠木軍を完全に分断せよ！',
            desc: '卓越した用兵で勝利を掴む。足利軍兵力+5,000、京都進駐！',
            isHistorical: true,
            action: (g) => {
              const p = g.provinces.find(pr => pr.ownerId === 'ashikaga') || g.provinces[0];
              p.troops += 5000;
              g.log('【水陸二面作戦 成功】大船団と陸戦部隊の連携により、敵軍の分断に成功しました！', 'important');
              return '海陸から同時に攻め寄せ、敵防衛線を突破！京洛への道を切り拓きました！';
            }
          },
          {
            text: '【歴史改変IF】楠木正成の智勇を讃え、破格の条件で和睦交渉を仕掛ける！',
            desc: '正成公を味方に引き入れる歴史的融和。足利軍の政治・智謀大幅向上、金+1,500！',
            isHistorical: false,
            action: (g) => {
              g.gold += 1500;
              g.log('【楠木との和睦】尊氏公の寛大なる器量により、楠木勢との融和に成功しました！', 'important');
              return '無駄な流血を避け、天下の名将・楠木正成と盟約を結ぶことに成功しました！';
            }
          }
        ]
      },
{
        id: 'nanban_trade',
        scenarioId: '*',
        year: 1543,
        title: '❖ 南蛮船来航・新式鉄砲と火薬の交易 ❖',
        subTitle: 'はるかイスパニア・ポルトガルより来たりし黒船の威容',
        check: (game) => game.year >= 1543 && game.year < 1600 && Math.random() < 0.01,
        narrative: (game) => '領内の湊に、白帆を揚げた巨大な南蛮船が入港してまいりました。カピタン（船長）は珍奇な南蛮渡りの文物を献上するとともに、最新式の火縄銃・カルバリン巨砲と良質な硝石の大量売買を持ちかけております。',
        choices: (game) => [
          {
            text: '【鉄砲大量購入】最新式鉄砲500挺と火薬を買い入れ、鉄砲隊を編成！',
            desc: '軍資金500貫を投じ、鉄砲隊を大幅増強！本拠地兵力+3,500！',
            isHistorical: true,
            action: (g) => {
              g.gold = Math.max(0, g.gold - 500);
              const myProvs = g.provinces.filter(p => p.ownerId === g.playerClanId);
              if (myProvs.length > 0) myProvs[0].troops += 3500;
              g.log('【鉄砲隊配備】南蛮最新式銃が全軍に配備され、火力と戦闘力が飛躍的に向上！', 'important');
              return '轟音響く最新式鉄砲を配備！合戦における遠距離火力と突撃力が大幅に強化されました！';
            }
          },
          {
            text: '【南蛮貿易港開設】関税を低く抑え、海外交易による莫大な富を得る！',
            desc: '南蛮商館を誘致し商業運上を急拡大。軍資金+1,500貫獲得！',
            isHistorical: false,
            action: (g) => {
              g.gold += 1500;
              g.log('【南蛮貿易の繁栄】港湾に世界中の富が集まり、軍資金1,500貫を獲得しました！', 'important');
              return '南蛮貿易港として大いに繁栄！世界と結ばれた港から莫大な交易利潤がもたらされました！';
            }
          }
        ]
      },
{
        id: 'kawagoe',
        scenarioId: '*',
        year: 1546,
        title: '❖ 河越夜戦・八万の大軍を崩す奇襲 ❖',
        subTitle: '日本三大夜戦・河越城を取り囲む連合軍の油断を突け',
        check: (game) => game.year === 1546 && (game.playerClanId === 'hojo' || game.playerClanId === 'uesugi'),
        narrative: (game) => game.playerClanId === 'hojo'
          ? '山内上杉・扇谷上杉・古河公方の連合軍八万が河越城を幾重にも包囲。北条氏康は僅か八千を率いて救援に駆けつける。「鎧を脱ぎ、身軽になって夜陰に乗じ突撃せよ！」十文字槍の夜襲を敢行するか、あるいは城兵と連携して持久戦を挑むか！'
          : '河越城を包囲して数ヶ月。敵の後詰・北条氏康は兵力寡少と見て、連合軍陣中には油断と酒宴が広がっている。夜番を厳しくして奇襲を警戒するか、総攻撃を仕掛けて一気に城を落とすか！',
        choices: (game) => game.playerClanId === 'hojo' ? [
          {
            text: '【史実ルート】甲冑を脱ぎ捨て十文字槍で突撃！漆黒の夜襲を敢行！',
            desc: '八万の大軍が壊滅！扇谷上杉家滅亡、関東の覇権確立！北条軍兵力+5,000、金+1,200！',
            isHistorical: true,
            action: (g) => {
              g.gold += 1200;
              const p = g.provinces.find(pr => pr.ownerId === 'hojo') || g.provinces[0];
              p.troops += 5000;
              g.provinces.filter(pr => pr.ownerId === 'uesugi').forEach(pr => pr.troops = Math.round(pr.troops * 0.4));
              g.log('【河越夜戦 大勝利】北条氏康公の電光石火の夜襲により八万の連合軍を完膚なきまでに撃破！', 'important');
              return '闇夜を裂いて突撃一番！敵連合軍は大混乱に陥り、関東の覇権は北条の手に帰しました！';
            }
          },
          {
            text: '【歴史改変IF】敵の補給路を封鎖し、包囲軍を飢餓に追い込む持久戦！',
            desc: '兵力の損耗なく連合軍を撤退させる。北条軍の兵糧+3,000、治安向上！',
            isHistorical: false,
            action: (g) => {
              g.rice += 3000;
              g.log('【兵站封鎖の勝利】糧道を断たれた連合軍は自壊し、無傷で河越城を救出しました！', 'important');
              return '兵站を巧みに絶ち、敵軍を内側から崩壊させて大勝利を収めました！';
            }
          }
        ] : [
          {
            text: '【歴史改変IF】油断を戒め夜番を徹底！北条の夜襲を逆迎撃！',
            desc: '氏康の奇襲部隊を伏兵で挟撃！上杉軍兵力+4,000、北条軍撃退！',
            isHistorical: false,
            action: (g) => {
              const p = g.provinces.find(pr => pr.ownerId === 'uesugi') || g.provinces[0];
              p.troops += 4000;
              g.log('【夜番徹底の妙】北条の奇襲を完全に看破！氏康勢を返り討ちにしました！', 'important');
              return '厳重な警備により夜襲を粉砕！関東管領の威信を大いに示しました！';
            }
          },
          {
            text: '【史実ルート】大軍の威勢をもって夜明けとともに河越城へ総突撃！',
            desc: '力攻めを敢行。攻城戦の経験蓄積、金+500獲得。',
            isHistorical: true,
            action: (g) => {
              g.gold += 500;
              g.log('【総突撃号令】大軍による総攻撃を期して陣容を整えました。');
              return '全軍に総攻撃を命じ、決戦の火蓋を切りました！';
            }
          }
        ]
      },
{
        id: 'okehazama',
        scenarioId: '*',
        year: 1560,
        title: '❖ 桶狭間の奇襲・今川本陣強襲 ❖',
        subTitle: '豪雨の田楽狭間に潜む今川義元四万の大軍',
        check: (game) => game.year === 1560 && (game.playerClanId === 'oda' || game.playerClanId === 'imagawa'),
        narrative: (game) => game.playerClanId === 'oda'
          ? '駿河・遠江・三河の軍勢四万を率い、尾張へと怒涛の進撃を開始した今川義元。織田信長は熱田神宮で必勝を祈願し、豪雨の中、田楽狭間に油断休息する義元本陣の虚を突くか、あるいは清洲城に全軍を集結し鉄壁の籠城戦を挑むか。天下の命運を分ける決断の刻が迫る！'
          : '尾張・清洲城を目指し破竹の進撃を続ける今川軍。折悪しく天候は激しい豪雨となった。斥候より「織田信長が寡兵を率いて田楽狭間へ向かっている」との不穏な報せが届く。本陣の防備を直ちに固めるか、あるいは進軍号令を維持して信長を誘い込むか！',
        choices: (game) => game.playerClanId === 'oda' ? [
          {
            text: '【史実ルート】豪雨に紛れ、田楽狭間の義元本陣へ乾坤一擲の急襲！',
            desc: '義元を討ち取り今川軍を壊滅させる。尾張・三河の情勢が一変し、自軍兵力+4,000、金+600獲得！',
            isHistorical: true,
            action: (g) => {
              g.gold += 600;
              const p = g.provinces.find(pr => pr.ownerId === 'oda');
              if (p) p.troops += 4000;
              g.provinces.filter(pr => pr.ownerId === 'imagawa').forEach(pr => pr.troops = Math.round(pr.troops * 0.5));
              g.log('【桶狭間の奇襲 成功】織田信長公の急襲により今川義元が討死！今川軍は総崩れとなりました！', 'important');
              g.okehazamaOccurred = true;
              g.updateTokugawaSurname(true);
              return '田楽狭間に雷鳴轟く中、信長公の突撃一番！見事今川義元を討ち取り、東海道の大軍を壊滅させました！';
            }
          },
          {
            text: '【歴史改変IF】清洲城に全軍集結！徹底籠城で大軍の兵糧切れを待つ！',
            desc: '兵力の損耗を防ぎ、防衛力を極限まで高める。全領国の治安+20、備蓄兵糧+1,200！',
            isHistorical: false,
            action: (g) => {
              g.rice += 1200;
              g.provinces.filter(pr => pr.ownerId === 'oda').forEach(pr => { pr.order = Math.min(100, pr.order + 20); pr.troops += 2000; });
              g.log('【清洲籠城の英断】堅固な城壁に阻まれ今川軍は補給難に陥り、退却を余儀なくされました！', 'important');
              return '堅牢無比なる清洲城の守りに、今川大軍は攻めあぐねて兵糧を浪費。損害皆無で敵を撤退せしめました！';
            }
          }
        ] : [
          {
            text: '【歴史改変IF】斥候の急報を容れ、本陣防備を固め織田軍を逆包囲！',
            desc: '信長の奇襲を逆手にとり撃破！尾張の織田領を激震させ、今川軍兵力+3,000！',
            isHistorical: false,
            action: (g) => {
              const p = g.provinces.find(pr => pr.ownerId === 'imagawa');
              if (p) p.troops += 3000;
              g.provinces.filter(pr => pr.ownerId === 'oda').forEach(pr => pr.troops = Math.round(pr.troops * 0.4));
              g.log('【桶狭間逆包囲 成功】今川義元公の智謀により織田の奇襲軍を返り討ちにしました！', 'important');
              return '奇襲を仕掛けてきた織田勢を四方から包囲網で殲滅！尾張侵攻の足がかりを盤石としました！';
            }
          },
          {
            text: '【史実ルート】豪雨は天の恵みと心得、全軍に清洲城への総攻撃を命ず！',
            desc: '士気は上がるが奇襲のリスクあり。今川軍士気向上、金+500獲得。',
            isHistorical: true,
            action: (g) => {
              g.gold += 500;
              g.log('【強気進軍】今川軍は進軍を継続。兵站を確保し軍資金を獲得しました。');
              return '義元公の大号令のもと進撃を継続。軍備を整え、決戦に備えます。';
            }
          }
        ]
      },
{
        id: 'kanegasaki',
        scenarioId: '*',
        year: 1570,
        title: '❖ 金ヶ崎の退き口・木下藤吉郎の殿 ❖',
        subTitle: '越前朝倉攻めの最中、盟友浅井長政の裏切り発覚！',
        check: (game) => game.year === 1570 && game.seasonIdx === 0 && (game.playerClanId === 'oda' || game.playerClanId === 'azai'),
        narrative: (game) => game.playerClanId === 'oda'
          ? '越前・朝倉義景を討つべく敦賀へ進軍した織田軍。そこへお市の方より「小豆袋（袋の鼠）」の密書が届く。妹婿・浅井長政が盟約を破り、織田軍の背後を突くべく出陣したという！挟撃の危機に直面した信長は、木下藤吉郎（後の秀吉）に殿（しんがり）を託して脱出するか、全軍反転攻勢を仕掛けるか！'
          : '信長と朝倉の激突。浅井家代々の盟約を守って朝倉を助け信長を挟撃するか、あるいは信長との姻戚関係を優先し同盟を堅持するか。近江小谷城主・浅井長政の前に運命の二筋の道が横たわる！',
        choices: (game) => game.playerClanId === 'oda' ? [
          {
            text: '【史実ルート】木下藤吉郎に殿を任せ、電光石火の速さで京都へ脱出！',
            desc: '信長は無事帰還、藤吉郎の武名は天下に轟く！全軍再編により兵力+3,500、金+500！',
            isHistorical: true,
            action: (g) => {
              g.gold += 500;
              const p = g.provinces.find(pr => pr.ownerId === 'oda') || g.provinces[0];
              p.troops += 3500;
              g.log('【金ヶ崎脱出 成功】木下藤吉郎の決死の殿により信長公は京洛へ無事帰還しました！', 'important');
              return '朽木越えを疾風の如く駆け抜け生還！藤吉郎の奮戦により全軍の損害を最小限に抑えました！';
            }
          },
          {
            text: '【歴史改変IF】撤退せず全軍反転！浅井・朝倉が合流する前に各個撃破！',
            desc: '電撃的各個撃破で近江・越前の両軍を撃攘！近江領内の浅井軍動揺、米+1,500！',
            isHistorical: false,
            action: (g) => {
              g.rice += 1500;
              g.provinces.filter(pr => pr.ownerId === 'azai').forEach(pr => pr.troops = Math.round(pr.troops * 0.6));
              g.log('【電撃反転攻勢】浅井軍の虚を突いて強襲！浅井・朝倉の包囲網を打ち破りました！', 'important');
              return '退却と見せかけて反転強襲！浅井軍を蹴散らし、逆転の勝機を掴み取りました！';
            }
          }
        ] : [
          {
            text: '【歴史改変IF】信長との同盟を維持！朝倉との調停に立ち天下静謐に貢献！',
            desc: '織田との同盟が深化。織田の経済・鉄砲支援を受け、浅井軍兵力+4,000、金+800！',
            isHistorical: false,
            action: (g) => {
              g.gold += 800;
              const p = g.provinces.find(pr => pr.ownerId === 'azai') || g.provinces[0];
              p.troops += 4000;
              g.log('【浅井・織田の絆】信長との強固な同盟を堅持！近江の支配を確固たるものにしました！', 'important');
              return '信長公と固い握手を交わし同盟を維持。最新式の鉄砲と軍資金の支援を得て大いに発展しました！';
            }
          },
          {
            text: '【史実ルート】朝倉との信義を重んじ、織田軍の退路を遮断し挟撃！',
            desc: '浅井武士の義気を示す。浅井軍の結束力・防衛力向上、米+2,000！',
            isHistorical: true,
            action: (g) => {
              g.rice += 2000;
              g.log('【浅井の義挙】朝倉との古き絆を守り出陣！織田軍を挟撃の脅威に晒しました！');
              return '「浅井の信義ここにあり！」小谷城から全軍出陣し、信長軍の退路へ立ち塞がりました！';
            }
          }
        ]
      },
{
        id: 'sanpougahara',
        scenarioId: '*',
        year: 1572,
        title: '❖ 三方ヶ原の激突・武田騎馬軍団の猛威 ❖',
        subTitle: '上洛を目指す武田信玄対徳川家康・遠江の大激戦',
        check: (game) => game.year === 1572 && (game.playerClanId === 'takeda' || game.playerClanId === 'tokugawa' || game.playerClanId === 'matsudaira'),
        narrative: () => '三方ヶ原。武田信玄は浜松城を素通りし、打って出た徳川軍を魚鱗の陣で迎え撃つ。史実どおり武田が勝って遠江を奪うか、徳川が遠江を守り切るか。',
        choices: (game) => [
          {
            text: '【史実】武田が勝つ。遠江は武田領になる。',
            desc: '魚鱗の陣で徳川軍は敗れ、遠江が武田領になる。',
            isHistorical: true,
            action: (g) => {
              const totomi = g.provinces.find(pr => pr.id === 'totomi');
              if (totomi) { totomi.ownerId = 'takeda'; totomi.troops = Math.max(totomi.troops || 0, 4500); }
              const ieyasu = (pr) => pr.ownerId === 'tokugawa' || pr.ownerId === 'matsudaira';
              if (g.playerClanId === 'takeda') {
                g.gold += 800;
                const p = g.provinces.find(pr => pr.ownerId === 'takeda' && pr.id !== 'totomi') || g.provinces.find(pr => pr.ownerId === 'takeda');
                if (p) p.troops += 4500;
                g.provinces.filter(ieyasu).forEach(pr => pr.troops = Math.round(pr.troops * 0.5));
              } else {
                g.provinces.filter(ieyasu).forEach(pr => pr.order = 100);
              }
              g.log('【三方ヶ原】武田軍が勝利し、遠江は武田領となりました。', 'important');
              return '史実どおり武田が勝ち、遠江は武田領となりました。';
            }
          },
          {
            text: '【改変】徳川が遠江を守り切る。領地は動かない。',
            desc: '徳川が遠江を守り、武田の進撃を退ける。遠江の領主は変わらない。',
            isHistorical: false,
            action: (g) => {
              if (g.playerClanId === 'tokugawa' || g.playerClanId === 'matsudaira') {
                g.rice += 1000;
                g.provinces.filter(pr => pr.ownerId === 'tokugawa' || pr.ownerId === 'matsudaira').forEach(pr => pr.troops += 3000);
              }
              g.log('【三方ヶ原】徳川が遠江を守り切り、武田軍は退きました。', 'important');
              return '徳川が遠江を守り切りました。遠江の領主は変わりません。';
            }
          }
        ]
      },
{
        id: 'honnoji',
        scenarioId: '*',
        year: 1582,
        title: '❖ 本能寺の変・天下統一前夜の激変 ❖',
        subTitle: '「敵は本能寺にあり！」京洛を揺るがす謀反と野望',
        check: (game) => game.year === 1582 && (game.playerClanId === 'oda' || game.playerClanId === 'akechi'),
        narrative: (game) => game.playerClanId === 'akechi'
          ? '西国・毛利攻めの援軍を命じられた明智光秀。しかし今や信長公は僅かな供回りとともに京都・本能寺に宿泊中。重臣たちを前に光秀は決断を迫られる。「敵は本能寺にあり」と天下を獲るか、あるいは忠節を守り毛利攻めへ出陣するか！'
          : '天下布武を目前にした織田信長。京都・本能寺にて茶会を催し休息中、突如として無数の銃声と勝ち鬨が響き渡る。桔梗紋の旗印――明智光秀の謀反である！寺院に踏みとどまり最後まで奮戦するか、あるいは南蛮寺の隠し地下道より脱出を図るか！',
        choices: (game) => game.playerClanId === 'akechi' ? [
          {
            text: '【史実ルート】「敵は本能寺にあり！」全軍反転、信長を急襲！',
            desc: '信長・信忠を討ち取り、山城・近江を手中に収める！諸将の所属先が再編され、天下の覇権へ名乗りを上げる！',
            isHistorical: true,
            action: (g) => {
              g.executeHonnoujiSuccession('akechi');
              g.gold += 1000;
              const p = g.provinces.find(pr => pr.ownerId === 'akechi') || g.provinces[0];
              p.troops += 5000;
              g.log('【本能寺の変 勃発】明智光秀公が本能寺を急襲、天下の覇権へ名乗りを上げました！', 'important');
              return '早朝の本能寺を完全包囲！信長公を討ち取り、天下の主導権を掌握しました！';
            }
          },
          {
            text: '【歴史改変IF】私心を捨て、忠臣として西国毛利攻めへ急行！',
            desc: '織田家筆頭重臣の地位を確立。織田信長との固い絆により、全領国の兵力+3,000、米+2,000！',
            isHistorical: false,
            action: (g) => {
              g.rice += 2000;
              g.provinces.filter(pr => pr.ownerId === 'akechi').forEach(pr => pr.troops += 3000);
              g.log('【忠誠の貫徹】明智光秀公の忠節に信長公は大いに報い、織田・明智の絆は盤石となりました！', 'important');
              return '謀反の誘惑を断ち切り、西国へ出陣！信長公より絶大なる信頼を得て、天下統一の筆頭功臣となりました！';
            }
          }
        ] : [
          {
            text: '【歴史改変IF】南蛮寺の秘密通路より安土城へ脱出！反撃の烽火を上げよ！',
            desc: '信長生存の奇跡！安土城へ逃れ諸将に光秀討伐を令す。織田軍兵力+6,000、全領地治安回復！',
            isHistorical: false,
            action: (g) => {
              const p = g.provinces.find(pr => pr.ownerId === 'oda') || g.provinces[0];
              p.troops += 6000;
              g.provinces.filter(pr => pr.ownerId === 'oda').forEach(pr => pr.order = 100);
              g.log('【信長脱出の奇跡】織田信長公は奇跡的に安土城へ生還！諸将へ光秀討伐の号令を発しました！', 'important');
              return '南蛮寺の地下道を駆け抜け、無事に安土城へ帰還！「光秀を討て！」と全国へ大号令を下しました！';
            }
          },
          {
            text: '【史実ルート】「是非に及ばず！」弓を執り、最後まで覇王の誇りを示し奮戦！',
            desc: '織田信長公・信忠公落命。後継大名（羽柴・明智・柴田・織田信雄）を選択し、各武将の所属先を切り替えて乱世を生き抜きます。',
            isHistorical: true,
            action: (g) => {
              g.executeHonnoujiSuccession();
              // 後継選択が閉じるまで次のイベント・季節へ進まない
              g._historyFollowUp = true;
              g.showHonnoujiSuccessorSelectModal({ title: '本能寺の変・後継勢力の選択' });
              g.log('【本能寺の変】織田信長公落命。天下は分裂し、各後継勢力が乱立しました！', 'important');
              return '「人間五十年、下天の内をくらぶれば、夢幻の如くなり」――信長公は業火の中で誇り高く散りました。後継勢力を選定してください。';
            }
          }
        ]
      },
{
        id: 'kunohe_rebellion',
        scenarioId: '*',
        year: 1590,
        title: '❖ 九戸政実の乱・奥州覇王の蜂起 ❖',
        subTitle: '秀吉の奥州仕置に抗う東北屈指の猛将・陸奥九戸城の死闘',
        check: (game) => {
          if (game.happenedEvents && game.happenedEvents.has('evt_1591_kunohe_rebellion')) return false;
          return (game.year === 1590 || game.year === 1591 || game.year === 1592) && (game.playerClanId === 'nanbu' || game.playerClanId === 'kunohe' || game.playerClanId === 'toyotomi' || game.playerClanId === 'date');
        },
        narrative: () => '豊臣秀吉の奥州仕置に反発した九戸政実が、陸奥九戸城で蜂起した。史実通りなら仕置軍が乱を鎮圧し、陸奥・陸中は南部信直の支配に戻る。史実を適用しなければ、九戸政実が仕置軍を撃退して奥州独立を果たす。',
        choices: () => [
          {
            text: '【史実ルート】奥州仕置軍が九戸城を攻略し、乱を鎮圧する。',
            desc: '陸奥・陸中は南部信直の支配に戻る。九戸の独立は成らない。',
            isHistorical: true,
            action: (g) => g.applyRebellionFromChoice('kunohe_rebellion', 'suppress')
          },
          {
            text: '【歴史改変】史実を適用せず、九戸政実の乱を成功させる。',
            desc: '九戸政実が仕置軍を撃退し、陸奥・陸中を掌握して奥州独立を果たす。',
            isHistorical: false,
            action: (g) => g.applyRebellionFromChoice('kunohe_rebellion', 'success')
          }
        ]
      },
{
        id: 'sekigahara',
        scenarioId: '*',
        year: 1600,
        title: '❖ 関ヶ原の決戦・松尾山の問鉄砲 ❖',
        subTitle: '東軍十万対西軍八万・天下分け目の大激突',
        check: (game) => game.year === 1600 && (game.playerClanId === 'tokugawa' || game.playerClanId === 'ishida' || game.playerClanId === 'toyotomi'),
        narrative: (game) => game.playerClanId === 'tokugawa'
          ? '濃霧晴れわたる関ヶ原の盆地。西軍・石田三成の本隊と激戦を繰り広げる中、松尾山に陣取る小早川秀秋一万五千は日和見を決め込み動こうとしない。徳川家康は苛立ちの末、松尾山へ威嚇の問鉄砲を撃ち込ませるか、あるいは東軍自慢の精鋭で正面突破を図るか！'
          : '関ヶ原の合戦は酣。大谷吉継隊の奮戦により東軍前衛を押し戻しつつあるが、松尾山の小早川秀秋と南宮山の毛利秀元が動かない。三成は使者を送り即時参戦を強く促すか、あるいは自軍の防備を固め持久戦へ持ち込むか！',
        choices: (game) => game.playerClanId === 'tokugawa' ? [
          {
            text: '【史実ルート】松尾山の小早川陣へ問鉄砲を撃ち込み、寝返りを決断させよ！',
            desc: '小早川軍が寝返り西軍大谷隊へ突撃！西軍総崩れとなり、東軍兵力+5,000、金+1,000獲得！',
            isHistorical: true,
            action: (g) => {
              g.gold += 1000;
              const p = g.provinces.find(pr => pr.ownerId === 'tokugawa') || g.provinces[0];
              p.troops += 5000;
              g.provinces.filter(pr => pr.ownerId === 'ishida').forEach(pr => pr.troops = Math.round(pr.troops * 0.4));
              g.log('【小早川寝返り 成功】問鉄砲に驚愕した小早川秀秋軍が西軍を強襲！天下分け目の大勝利！', 'important');
              return '松尾山から雪崩を打って駆け下りる小早川勢！西軍の防衛線は一瞬にして崩壊しました！';
            }
          },
          {
            text: '【歴史改変IF】他人の離反に頼らず、徳川旗本精鋭で三成本陣へ正面総突撃！',
            desc: '徳川武士団の無敵の武勇を見せつける。徳川軍全領国の兵力+4,000、武勇+10！',
            isHistorical: false,
            action: (g) => {
              g.provinces.filter(pr => pr.ownerId === 'tokugawa').forEach(pr => pr.troops += 4000);
              g.log('【徳川精鋭の正面突破】葵の御旗のもと徳川本隊が西軍中央を粉砕撃破しました！', 'important');
              return '小早川の態度を待たず、家康公自ら采配を振り正面撃破！徳川武士団の底力を見せつけました！';
            }
          }
        ] : [
          {
            text: '【歴史改変IF】毛利・吉川軍に直ちに背後を突かせ、家康本陣を完全包囲！',
            desc: '毛利秀元・吉川広家が参戦！家康本隊を挟み撃ちにし、西軍兵力+6,000、東軍大打撃！',
            isHistorical: false,
            action: (g) => {
              const p = g.provinces.find(pr => pr.ownerId === 'ishida') || g.provinces[0];
              p.troops += 6000;
              g.provinces.filter(pr => pr.ownerId === 'tokugawa').forEach(pr => pr.troops = Math.round(pr.troops * 0.5));
              g.log('【西軍総力戦の快挙】毛利・吉川の大軍が徳川の背後を急襲！歴史を覆す大包囲殲滅！', 'important');
              return '「毛利参陣せり！」南宮山の大軍が徳川軍の背後へ殺到！家康公を追い詰めて歴史的大勝利を収めました！';
            }
          },
          {
            text: '【史実ルート】大谷吉継・宇喜多秀家とともに義の陣形を死守！',
            desc: '不屈の忠義で防戦。西軍兵の結束力向上、米+2,500獲得！',
            isHistorical: true,
            action: (g) => {
              g.rice += 2500;
              g.log('【義の防戦】大谷・宇喜多の獅子奮迅の戦いにより、東軍の進撃を頑強に食い止めました！');
              return '豊臣恩顧の忠義を胸に奮戦！東軍の猛攻をしのぎ、防衛線を維持しました！';
            }
          }
        ]
      },
{
        id: 'shimabara_rebellion',
        scenarioId: '*',
        year: 1637,
        title: '❖ 島原の乱・原城籠城と幕府総動員 ❖',
        subTitle: '十字架の御旗を掲げる三万七千と西国諸大名十二万の激突',
        check: (game) => game.year === 1637 && (game.playerClanId === 'tokugawa' || game.playerClanId === 'amakusa' || game.playerClanId === 'hosokawa' || game.playerClanId === 'tachibana' || game.playerClanId === 'kuroda' || game.playerClanId === 'nabeshima'),
        narrative: (game) => game.playerClanId === 'amakusa'
          ? '苛酷を極める年貢取り立てとキリシタン弾圧に対し、島原・天草の農民・浪人三万七千が原城に蜂起！16歳の天草四郎時貞を中心に十字架の御旗のもと固く結束した。幕府軍十二万が城を重囲する中、信仰と有馬・小西旧臣の軍法で鉄壁の籠城戦を挑むか、あるいは闇夜に乗じて出撃し長崎を占拠して南蛮船と合流するか！'
          : '肥前島原・天草において天草四郎率いるキリシタン・浪人衆三万七千が原城に立て籠もり、幕府上使・板倉重昌が討死する大騒乱となった。幕府は知恵伊豆・松平信綱を総大将に、九州・西国の諸大名を総動員！兵糧攻めの末に大軍で原城を一気に総攻撃するか、あるいは苛政の元凶・松倉勝家を処罰し減税と和睦で乱の早期収拾を図るか！',
        choices: (game) => game.playerClanId === 'amakusa' ? [
          {
            text: '【歴史改変IF・反乱大成功】十字架の御旗のもと幕府十二万を完全撃退！九州西海に自由独立国を樹立！',
            desc: '原城の要害と不退転の団結で幕府軍を返り討ち！肥前を完全掌握し肥後へ進撃！自軍兵力+7,000、金+2,500！',
            isHistorical: false,
            action: (g) => {
              g.gold += 2500;
              const hizen = g.provinces.find(pr => pr.id === 'hizen');
              if (hizen) {
                hizen.troops += 7000;
                hizen.defense = 100;
                hizen.order = 100;
              }
              const higo = g.provinces.find(pr => pr.id === 'higo');
              if (higo) {
                higo.ownerId = 'amakusa';
                higo.troops = 4000;
              }
              g.provinces.filter(pr => pr.ownerId === 'tokugawa').forEach(pr => {
                pr.troops = Math.round(pr.troops * 0.7);
              });
              g.log('【島原の乱 大勝利】天草四郎の奇跡の軍配により幕府軍十二万を完膚なきまでに撃退！九州西海にキリシタン独立領国を樹立しました！', 'important');
              return '十字架の御旗翻る原城にて幕府軍を撃滅！民衆の自由と信仰を守り抜き、西海に新たな時代を切り拓きました！';
            }
          },
          {
            text: '【史実ルート】十字架の御旗のもと、原城に死守籠城！奇跡の信仰で幕府軍を幾度も撃退！',
            desc: '驚異の団結力で籠城防衛！自軍兵力+5,000、防御度+40！敵軍に痛烈な打撃を与える！',
            isHistorical: true,
            action: (g) => {
              const hizen = g.provinces.find(pr => pr.id === 'hizen');
              if (hizen) {
                hizen.troops += 5000;
                hizen.defense = Math.min(100, (hizen.defense || 50) + 40);
              }
              g.provinces.filter(pr => pr.ownerId === 'tokugawa').forEach(pr => {
                pr.troops = Math.round(pr.troops * 0.85);
              });
              g.log('【原城死守の奇跡】天草四郎の統率のもと、一揆軍は幕府軍の猛攻を幾度も撃退しました！', 'important');
              return '十字架の御旗翻る原城にて、三万七千の信徒と武士団が鉄壁の結束を発揮！幕府軍に甚大な損害を与えました！';
            }
          }
        ] : [
          {
            text: '【史実ルート】松平信綱の深謀！兵糧攻めの末に西国十二万の大軍で原城一斉総攻撃！',
            desc: '島原の乱を完全鎮圧！天下の泰平を盤石とし、幕府の威信が劇的向上！自軍兵力+5,000、金+1,500獲得！肥前を天領直轄化！',
            isHistorical: true,
            action: (g) => {
              g.gold += 1500;
              const hizen = g.provinces.find(pr => pr.id === 'hizen');
              if (hizen) {
                hizen.ownerId = g.playerClanId;
                hizen.troops = Math.max(hizen.troops, 5000);
                hizen.order = 95;
              }
              g.provinces.filter(pr => pr.ownerId === g.playerClanId).forEach(pr => {
                pr.troops += 1000;
              });
              g.log('【島原の乱 平定】松平信綱・九州諸大名の総攻撃により原城陥落！乱は完全鎮圧されました！', 'important');
              return '西国諸大名の総力をもって原城を攻略！反乱を完全に鎮圧し、天下の泰平と幕府の威信を揺るぎなきものとしました！';
            }
          },
          {
            text: '【歴史改変IF】苛政の元凶・松倉勝家を改易処断！寛大な減税と和睦で乱を収拾！',
            desc: '無益な殺傷を避け領民の心を掴む。九州全領国の治安+25、兵糧+3,000獲得！キリシタン武士団が帰順！',
            isHistorical: false,
            action: (g) => {
              g.rice += 3000;
              const hizen = g.provinces.find(pr => pr.id === 'hizen');
              if (hizen) {
                hizen.ownerId = g.playerClanId;
                hizen.order = 90;
              }
              g.provinces.forEach(pr => {
                if (pr.region === '九州') pr.order = Math.min(100, (pr.order || 80) + 25);
              });
              g.log('【仁政による和睦】松倉勝家を厳罰に処し減税を断行！一揆勢の帰順を得て平和裏に事態を収拾しました！', 'important');
              return '悪政を糾弾して民心を取り戻し、戦火を未然に鎮火。名君の器量を天下に示しました！';
            }
          }
        ]
      },
{
        id: 'keian_yui_rebellion',
        scenarioId: '*',
        year: 1651,
        title: '❖ 由比正雪の乱（慶安の変）・十万牢人の江戸城強襲 ❖',
        subTitle: '家光急逝・十万の浪人を束ねて武断政治を揺るがす軍学者の大陰謀',
        check: (game) => {
          if (game.happenedEvents && game.happenedEvents.has('evt_1651_keian_hen')) return false;
          return game.year === 1651 && (game.playerClanId === 'yui' || game.playerClanId === 'tokugawa' || game.playerClanId === 'kishu' || game.playerClanId === 'owari' || game.playerClanId === 'aizu');
        },
        narrative: () => '由比正雪と丸橋忠弥が、家光薨去に乗じて幕府転覆を謀った。史実通りなら松平信綱が一味を捕縛し、乱は鎮圧される。史実を適用しなければ、江戸城夜襲が成功し、正雪が武蔵・駿河・相模を掌握する。',
        choices: () => [
          {
            text: '【史実ルート】松平信綱が正雪一党を捕縛し、乱を鎮圧する。',
            desc: '慶安の変は未然に防がれ、武蔵・駿河は幕府の天領支配のままとなる。',
            isHistorical: true,
            action: (g) => g.applyRebellionFromChoice('keian_yui_rebellion', 'suppress')
          },
          {
            text: '【歴史改変】史実を適用せず、由比正雪の乱を成功させる。',
            desc: '丸橋忠弥の江戸城夜襲が成功し、由比正雪が武蔵・駿河・相模を掌握する。',
            isHistorical: false,
            action: (g) => g.applyRebellionFromChoice('keian_yui_rebellion', 'success')
          }
        ]
      },
{
        id: 'tenguto_rebellion',
        scenarioId: '*',
        year: 1864,
        title: '❖ 水戸天狗党の乱・中山道突破と尊皇維新 ❖',
        subTitle: '筑波山挙兵から雪の中山道千キロを踏破・尊皇攘夷の熱誠',
        check: (game) => {
          if (game.happenedEvents && game.happenedEvents.has('evt_1864_tenguto_rebellion')) return false;
          return game.year == 1864 && (game.playerClanId === 'mito' || game.playerClanId === 'tokugawa' || game.playerClanId === 'mori' || game.playerClanId === 'shimazu' || game.playerClanId === 'aizu');
        },
        narrative: () => '武田耕雲斎・藤田小四郎率いる天狗党が筑波山で挙兵し、中山道を西上して越前敦賀に達した。史実通りなら追討軍が包囲して乱を鎮圧する。史実を適用しなければ、天狗党が包囲を突破して近江へ進出する。',
        choices: () => [
                    {
            text: '【歴史改変】史実を適用せず、天狗党の乱を成功させる。',
            desc: '天狗党が敦賀の包囲を突破し、近江南北と常陸を水戸勢が掌握する。',
            isHistorical: false,
            action: (g) => g.applyRebellionFromChoice('tenguto_rebellion', 'success')
          },{
            text: '【史実ルート】諸藩の追討軍が敦賀で天狗党を包囲し、乱を鎮圧する。',
            desc: '天狗党は敦賀で降伏する。近江は井伊家・幕府の支配のまま、常陸は水戸藩の領に留まる。',
            isHistorical: true,
            action: (g) => g.applyRebellionFromChoice('tenguto_rebellion', 'suppress')
          }

        ]
      },
{
        id: 'tobafushimi',
        scenarioId: '*',
        year: 1868,
        title: '❖ 鳥羽・伏見の戦い ＆ 錦の御旗 ❖',
        subTitle: '幕末維新の夜明け・近代兵器と武士魂の激突',
        check: (game) => game.year === 1868 && (game.playerClanId === 'meiji' || game.playerClanId === 'tokugawa' || game.playerClanId === 'shimazu' || game.playerClanId === 'mori'),
        narrative: (game) => (game.playerClanId === 'meiji' || game.playerClanId === 'shimazu' || game.playerClanId === 'mori')
          ? '鳥羽街道・伏見街道で始まった新政府軍五千と旧幕府軍一万五千の激突。薩摩の砲兵と長州の銃隊が奮戦する中、朝廷より授かりし「錦の御旗」が前線に翻る！朝敵の汚名を恐れる旧幕府軍に対し、総攻撃を仕掛けるか、あるいは降伏を促すか！'
          : '大坂城から進軍した旧幕府軍。兵力では三倍勝るものの、新政府軍の最新式アームストロング砲とスナイドル銃に阻まれる。そこへ突如翻る「錦の御旗」！恭順の道を選び海路江戸へ退くか、大坂城に籠もり徹底抗戦を挑むか！',
        choices: (game) => (game.playerClanId === 'meiji' || game.playerClanId === 'shimazu' || game.playerClanId === 'mori') ? [
          {
            text: '【史実ルート】錦の御旗を高く掲げ、朝廷の官軍として総攻撃！',
            desc: '旧幕府軍は戦意喪失し大坂城へ退却！新政府軍兵力+5,000、近畿一円を完全制圧！',
            isHistorical: true,
            action: (g) => {
              const p = g.provinces.find(pr => pr.ownerId === g.playerClanId) || g.provinces[0];
              p.troops += 5000;
              g.provinces.filter(pr => pr.ownerId === 'tokugawa').forEach(pr => pr.troops = Math.round(pr.troops * 0.4));
              g.log('【錦の御旗の奇跡】官軍の錦旗に敵軍は総崩れ！鳥羽・伏見の大勝利を収めました！', 'important');
              return '菊の御紋の錦旗が翻ると、敵兵は戦意を失い潰走！維新への決定打となりました！';
            }
          },
          {
            text: '【歴史改変IF】徳川宗家に対し寛大な講和を提示し、無血で公議政体を発足！',
            desc: '内乱を即時終結させ、国力を温存。軍資金+2,000、全領地治安最大化！',
            isHistorical: false,
            action: (g) => {
              g.gold += 2000;
              g.provinces.forEach(pr => pr.order = 100);
              g.log('【大政奉還・無血融和】内戦の流血を最小限に防ぎ、諸藩合議の新国家を樹立しました！', 'important');
              return '徳川家と速やかに和睦を結び、国力を損なうことなく近代国家の建設へ踏み出しました！';
            }
          }
        ] : [
          {
            text: '【歴史改変IF】大坂城に籠もり諸藩を糾合！近代砲兵で徹底持久戦！',
            desc: '大坂城の巨城を盾に反撃！幕府海軍の軍艦を活用し、旧幕府軍兵力+6,000！',
            isHistorical: false,
            action: (g) => {
              const p = g.provinces.find(pr => pr.ownerId === 'tokugawa') || g.provinces[0];
              p.troops += 6000;
              g.log('【大坂城死守の英断】幕府海軍と近代砲兵を組織し、新政府軍の進撃を阻止しました！', 'important');
              return '東洋一の名城・大坂城に拠り、榎本海軍の艦砲射撃とともに反撃を開始しました！';
            }
          },
          {
            text: '【史実ルート】朝敵となるを恐れ、海路江戸へ退却し恭順謹慎の道を選ぶ。',
            desc: '無用な戦火を避け、江戸を戦火から救う。軍資金+1,500獲得。',
            isHistorical: true,
            action: (g) => {
              g.gold += 1500;
              g.log('【恭順の道】無駄な流血を避けるため海路江戸へ退却。再起を図ります。');
              return '朝廷への恭順を示しつつ江戸へ後退。万民を戦火から守る英断を下しました。';
            }
          }
        ]
      },
{
        id: 'great_harvest',
        scenarioId: '*',
        title: '❖ 五穀豊穣・領民歓喜の大豊作 ❖',
        subTitle: '天候恵まれ黄金色に波打つ美田・八百万の神々の恵み',
        check: (game) => game.seasonIdx === 2 && Math.random() < 0.01,
        narrative: (game) => '今年の秋は風雨順調にして、領内津々浦々で空前絶後の大豊作となりました。黄金色の稲穂が頭を垂れ、蔵に収まりきらぬほどの米が収穫されています。領民たちは太鼓を打ち鳴らし、殿の徳政を讃えて踊り狂っています。',
        choices: (game) => [
          {
            text: '【徳政令と年貢減免】豊作の喜びを領民と分かち合い、民心を完全に掴む！',
            desc: '全領国の治安が100に達し、感謝した若者2,500人が兵士に志願！',
            isHistorical: true,
            action: (g) => {
              g.provinces.filter(p => p.ownerId === g.playerClanId).forEach(p => { p.order = 100; p.troops += 500; });
              g.log('【仁政の誉れ】民忠と治安が最大化！殿の温情に報いるため若者たちが軍へ馳せ参じました！', 'important');
              return '「これぞ名君の鑑！」と領民が感涙。治安は盤石となり、忠義に燃える新兵が加わりました！';
            }
          },
          {
            text: '【天下覇道の兵糧備蓄】余剰米を軍用米として一手に買い上げ備蓄！',
            desc: '今後の長期遠征に備え、兵糧米を一気に+3,500石獲得！',
            isHistorical: false,
            action: (g) => {
              g.rice += 3500;
              g.log('【巨額兵糧備蓄】全国遠征を支える万全の兵站米3,500石を確保しました！', 'important');
              return '各城の米蔵を満杯にし、いかなる長期合戦にも耐えうる鉄壁の補給線を確立しました！';
            }
          }
        ]
      }
];;
if (typeof window !== "undefined") window.HISTORICAL_CHOICE_EVENTS = HISTORICAL_CHOICE_EVENTS;

export const OFFICER_AFFILIATION_RULES = [
  // =========================================================================
  // 17世紀シナリオ（1600関ヶ原、1614大坂の陣、1637島原の乱、1651慶安の変）史実武将配属ルール
  // =========================================================================

  // --- 1600 関ヶ原の戦い ---
  // 黒田如水（官兵衛）: 豊前中津挙兵・黒田家臣
  {
    id: 'kuroda_kanbei_buzen_1600',
    officerIds: ['off_kuroda_kanbei'],
    scenarioIds: ['1600'],
    setClanId: 'kuroda',
    setDefaultProv: 'buzen',
    setAssignedProv: 'buzen',
    setDaimyo: false
  },
  // 後藤又兵衛: 黒田家筆頭重臣・関ヶ原先鋒
  {
    id: 'goto_matabei_kuroda_buzen_1600',
    officerIds: ['off_goto_matabei'],
    scenarioIds: ['1600'],
    setClanId: 'kuroda',
    setDefaultProv: 'buzen',
    setAssignedProv: 'buzen',
    setDaimyo: false
  },
  // 島左近: 石田三成筆頭家老・佐和山北近江
  {
    id: 'shima_sakon_ishida_north_omi_1600',
    officerIds: ['off_shima_sakon'],
    scenarioIds: ['1600'],
    setClanId: 'ishida',
    setDefaultProv: 'north_omi',
    setAssignedProv: 'north_omi',
    setDaimyo: false
  },

  // --- 1614 大坂の陣（大坂浪人五人衆・主力入城） ---
  // 真田幸村: 大坂城入城・真田丸
  {
    id: 'sanada_yukimura_toyotomi_settsu_1614',
    officerIds: ['off_sanada_yukimura'],
    scenarioIds: ['1614'],
    setClanId: 'toyotomi',
    setDefaultProv: 'settsu',
    setAssignedProv: 'settsu',
    setDaimyo: false
  },
  // 長宗我部盛親: 大坂城入城・八尾若江奮戦
  {
    id: 'chosokabe_morichika_toyotomi_settsu_1614',
    officerIds: ['off_chosokabe_morichika'],
    scenarioIds: ['1614'],
    setClanId: 'toyotomi',
    setDefaultProv: 'settsu',
    setAssignedProv: 'settsu',
    setDaimyo: false
  },
  // 明石全登: 大坂城入城・キリシタン部隊奮戦
  {
    id: 'akashi_teruzumi_toyotomi_settsu_1614',
    officerIds: ['off_akashi_teruzumi'],
    scenarioIds: ['1614'],
    setClanId: 'toyotomi',
    setDefaultProv: 'settsu',
    setAssignedProv: 'settsu',
    setDaimyo: false
  },
  // 後藤又兵衛・毛利勝永: 大坂城入城・豊臣家配下
  {
    id: 'goto_matabei_mori_katsunaga_toyotomi_settsu_1614',
    officerIds: ['off_goto_matabei', 'off_mori_katsunaga'],
    scenarioIds: ['1614'],
    setClanId: 'toyotomi',
    setDefaultProv: 'settsu',
    setAssignedProv: 'settsu',
    setDaimyo: false
  },

  // --- 1637 島原の乱 ---
  // 有馬直純: 日向延岡藩主独立
  {
    id: 'arima_naozumi_hyuga_daimyo_1637',
    officerIds: ['off_jd_053'],
    scenarioIds: ['1637'],
    setClanId: 'arima',
    setDefaultProv: 'hyuga',
    setAssignedProv: 'hyuga',
    setDaimyo: true
  },


  // =========================================================================
  // 古代・平安・源平シナリオ（12世紀以前）史実武将配属ルール
  // =========================================================================

  // --- 1028 長元元年 平忠常の乱 ---
  {
    id: 'tadatsune_1028',
    officerIds: ['off_taira_tadanetsune'],
    scenarioIds: ['1028'],
    setClanId: 'taira_tadatsune',
    setDefaultProv: 'kazusa',
    setAssignedProv: 'kazusa',
    setDaimyo: true
  },
  {
    id: 'tsunemasa_1028',
    officerIds: ['off_taira_tsunemasa'],
    scenarioIds: ['1028'],
    setClanId: 'taira_tadatsune',
    setDefaultProv: 'shimousa',
    setAssignedProv: 'shimousa',
    setDaimyo: false
  },
  {
    id: 'tsuneharu_1028',
    officerIds: ['off_taira_tsuneharu'],
    scenarioIds: ['1028'],
    setClanId: 'taira_tadatsune',
    setDefaultProv: 'awa_boshu',
    setAssignedProv: 'awa_boshu',
    setDaimyo: false
  },
  {
    id: 'yorinobu_1028',
    officerIds: ['off_minamoto_yorinobu_1028'],
    scenarioIds: ['1028'],
    setClanId: 'minamoto_tsunemoto',
    setDefaultProv: 'kawachi',
    setAssignedProv: 'kawachi',
    setDaimyo: true
  },

  // --- 1056 天喜4年 前九年の役 ---
  {
    id: 'tsunekiyo_abe_1056',
    officerIds: ['off_fujiwara_tsunekiyo'],
    scenarioIds: ['1056'],
    setClanId: 'abe',
    setDefaultProv: 'rikuchu',
    setAssignedProv: 'rikuchu',
    setDaimyo: false
  },
  {
    id: 'hidetake_kiyohara_1056',
    officerIds: ['off_yohiko_hidetake'],
    scenarioIds: ['1056'],
    setClanId: 'kiyohara',
    setDefaultProv: 'ugo',
    setAssignedProv: 'ugo',
    setDaimyo: false
  },
  {
    id: 'yoriyoshi_tagajo_1056',
    officerIds: ['off_minamoto_yoriyoshi'],
    scenarioIds: ['1056'],
    setClanId: 'minamoto_tsunemoto',
    setDefaultProv: 'rikuzen',
    setAssignedProv: 'rikuzen',
    setDaimyo: true
  },
  {
    id: 'yoshiie_tagajo_1056',
    officerIds: ['off_minamoto_yoshiie'],
    scenarioIds: ['1056'],
    setClanId: 'minamoto_tsunemoto',
    setDefaultProv: 'rikuzen',
    setAssignedProv: 'rikuzen',
    setDaimyo: false
  },

  // --- 1087 寛治元年 後三年の役 ---
  {
    id: 'hidetake_kiyohara_1087',
    officerIds: ['off_yohiko_hidetake'],
    scenarioIds: ['1087'],
    setClanId: 'minamoto_tsunemoto',
    setDefaultProv: 'ugo',
    setAssignedProv: 'ugo',
    setDaimyo: false
  },
  {
    id: 'yoshiie_tagajo_1087',
    officerIds: ['off_minamoto_yoshiie'],
    scenarioIds: ['1087'],
    setClanId: 'minamoto_tsunemoto',
    setDefaultProv: 'rikuzen',
    setAssignedProv: 'rikuzen',
    setDaimyo: true
  },
  {
    id: 'yoshimitsu_tagajo_1087',
    officerIds: ['off_minamoto_yoshimitsu'],
    scenarioIds: ['1087'],
    setClanId: 'minamoto_tsunemoto',
    setDefaultProv: 'rikuzen',
    setAssignedProv: 'rikuzen',
    setDaimyo: false
  },

  // --- 1156 保元の乱 ---
  {
    id: 'tametomo_sutoku_fixed_1156',
    officerIds: ['off_minamoto_tametomo'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: false
  },

  // --- 1180〜1189 源平合戦 鎌倉幕府重臣 ---
  {
    id: 'kanto_vassals_yoritomo_all',
    officerIds: ['off_hojo_tokimasa', 'off_kajiwara_kagetoki', 'off_koyama_tomomasa', 'off_adachi_morinaga'],
    scenarioIds: ['1180', '1183', '1184', '1185', '1189'],
    setClanId: 'genji_yoritomo',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },
  {
    id: 'kumagai_naozane_yoritomo',
    officerIds: ['off_kumagai_naozane'],
    scenarioIds: ['1180', '1183', '1184', '1185', '1189'],
    setClanId: 'genji_yoritomo',
    setDefaultProv: 'musashi',
    setAssignedProv: 'musashi',
    setDaimyo: false
  },
  {
    id: 'oba_kagechika_taira_1180',
    officerIds: ['off_oba_kagechika'],
    scenarioIds: ['1180'],
    setClanId: 'taira',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },
  {
    id: 'ito_sukekiyo_taira_1180',
    officerIds: ['off_ito_sukekiyo'],
    scenarioIds: ['1180', '1183'],
    setClanId: 'taira',
    setDefaultProv: 'izu',
    setAssignedProv: 'izu',
    setDaimyo: false
  },
  {
    id: 'fujiwara_kunihiro_hiraizumi',
    officerIds: ['off_fujiwara_kunihiro'],
    scenarioIds: ['1180', '1183', '1184', '1185', '1189'],
    setClanId: 'fujiwara_hiraizumi',
    setDefaultProv: 'rikuzen',
    setAssignedProv: 'rikuzen',
    setDaimyo: false
  },
  {
    id: 'fujiwara_tadahira_hiraizumi',
    officerIds: ['off_fujiwara_tadahira_ou'],
    scenarioIds: ['1183', '1184', '1185', '1189'],
    setClanId: 'fujiwara_hiraizumi',
    setDefaultProv: 'mutsu',
    setAssignedProv: 'mutsu',
    setDaimyo: false
  },
  {
    id: 'nasu_yoichi_yoritomo_1184',
    officerIds: ['off_nasu_no_yoichi'],
    scenarioIds: ['1184', '1189'],
    setClanId: 'genji_yoritomo',
    setDefaultProv: 'shimotsuke',
    setAssignedProv: 'shimotsuke',
    setDaimyo: false
  },

  // --- 1185 壇ノ浦の戦い（源義経勢力への配属） ---
  {
    id: 'yoshitsune_dan_no_ura_1185',
    officerIds: ['off_minamoto_yoshitsune'],
    scenarioIds: ['1185'],
    setClanId: 'genji_yoshitsune',
    setDefaultProv: 'aki',
    setAssignedProv: 'aki',
    setDaimyo: true
  },
  {
    id: 'benkei_dan_no_ura_1185',
    officerIds: ['off_musashibo_benkei'],
    scenarioIds: ['1185'],
    setClanId: 'genji_yoshitsune',
    setDefaultProv: 'aki',
    setAssignedProv: 'aki',
    setDaimyo: false
  },
  {
    id: 'sato_tadanobu_1185',
    officerIds: ['off_sato_tadanobu'],
    scenarioIds: ['1185'],
    setClanId: 'genji_yoshitsune',
    setDefaultProv: 'sanuki',
    setAssignedProv: 'sanuki',
    setDaimyo: false
  },
  {
    id: 'sato_tsugunobu_1185',
    officerIds: ['off_sato_tsugunobu'],
    scenarioIds: ['1185'],
    setClanId: 'genji_yoshitsune',
    setDefaultProv: 'sanuki',
    setAssignedProv: 'sanuki',
    setDaimyo: false
  },
  {
    id: 'nasu_yoichi_1185',
    officerIds: ['off_nasu_no_yoichi'],
    scenarioIds: ['1185'],
    setClanId: 'genji_yoshitsune',
    setDefaultProv: 'sanuki',
    setAssignedProv: 'sanuki',
    setDaimyo: false
  },

  // --- 1189 奥州合戦（義経・弁慶の平泉在陣） ---
  {
    id: 'yoshitsune_hiraizumi_1189',
    officerIds: ['off_minamoto_yoshitsune'],
    scenarioIds: ['1189'],
    setClanId: 'fujiwara_hiraizumi',
    setDefaultProv: 'rikuchu',
    setAssignedProv: 'rikuchu',
    setDaimyo: false
  },
  {
    id: 'benkei_hiraizumi_1189',
    officerIds: ['off_musashibo_benkei'],
    scenarioIds: ['1189'],
    setClanId: 'fujiwara_hiraizumi',
    setDefaultProv: 'rikuchu',
    setAssignedProv: 'rikuchu',
    setDaimyo: false
  },
  {
    id: 'kunihiro_azukashi_1189',
    officerIds: ['off_fujiwara_kunihiro'],
    scenarioIds: ['1189'],
    setClanId: 'fujiwara_hiraizumi',
    setDefaultProv: 'iwashiro',
    setAssignedProv: 'iwashiro',
    setDaimyo: false
  },

  // 1156 保元の乱（崇徳上皇軍）
  {
    id: 'sutoku_daimyo_1156',
    officerIds: ['off_sutoku_in'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: true
  },
  {
    id: 'yorinaga_sutoku_1156',
    officerIds: ['off_fujiwara_yorinaga'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: false
  },
  {
    id: 'tameyoshi_sutoku_1156',
    officerIds: ['off_minamoto_tameyoshi'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'kawachi',
    setAssignedProv: 'kawachi',
    setDaimyo: false
  },
  {
    id: 'tametomo_sutoku_1156',
    officerIds: ['off_minamoto_tametomo'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: false
  },
  {
    id: 'tadamasa_sutoku_1156',
    officerIds: ['off_taira_tadamasa'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: false
  },
  {
    id: 'iehira_sutoku_1156',
    officerIds: ['off_taira_iehira'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: false
  },
  {
    id: 'yorinori_sutoku_1156',
    officerIds: ['off_minamoto_yorinori'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'kawachi',
    setAssignedProv: 'kawachi',
    setDaimyo: false
  },

  // 1156 保元の乱（後白河天皇軍）
  {
    id: 'shinzei_goshirakawa_1156',
    officerIds: ['off_fujiwara_shinzei'],
    scenarioIds: ['1156'],
    setClanId: 'goshirakawa_in',
    setDefaultProv: 'yamashiro',
    setAssignedProv: 'yamashiro',
    setDaimyo: false
  },
  {
    id: 'yorimasa_goshirakawa_1156',
    officerIds: ['off_minamoto_yorimasa'],
    scenarioIds: ['1156'],
    setClanId: 'goshirakawa_in',
    setDefaultProv: 'south_omi',
    setAssignedProv: 'south_omi',
    setDaimyo: false
  },

  // 1156 保元の乱（平氏・源氏）
  {
    id: 'shigemori_taira_1156',
    officerIds: ['off_taira_shigemori'],
    scenarioIds: ['1156', '1159'],
    setClanId: 'taira',
    setDefaultProv: 'ise',
    setAssignedProv: 'ise',
    setDaimyo: false
  },
  {
    id: 'motomori_taira_1156',
    officerIds: ['off_taira_motomori'],
    scenarioIds: ['1156'],
    setClanId: 'taira',
    setDefaultProv: 'aki',
    setAssignedProv: 'aki',
    setDaimyo: false
  },
  {
    id: 'motomori_taira_1159',
    officerIds: ['off_taira_motomori'],
    scenarioIds: ['1159'],
    setClanId: 'taira',
    setDefaultProv: 'chikuzen',
    setAssignedProv: 'chikuzen',
    setDaimyo: false
  },
  {
    id: 'munemori_taira_1159',
    officerIds: ['off_taira_munemori'],
    scenarioIds: ['1159'],
    setClanId: 'taira',
    setDefaultProv: 'harima',
    setAssignedProv: 'harima',
    setDaimyo: false
  },
  {
    id: 'yoshiyasu_yoshitomo_1156',
    officerIds: ['off_ashikaga_yoshiyasu'],
    scenarioIds: ['1156'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'shimotsuke',
    setAssignedProv: 'shimotsuke',
    setDaimyo: false
  },
  {
    id: 'yoshihira_yoshitomo_1156',
    officerIds: ['off_minamoto_yoshihira'],
    scenarioIds: ['1156'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },
  {
    id: 'masakiyo_yoshitomo_1156',
    officerIds: ['off_kamata_masakiyo'],
    scenarioIds: ['1156'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },

  // 1159 平治の乱（源義朝軍）
  {
    id: 'nobuyori_yamashiro_1159',
    officerIds: ['off_fujiwara_nobuyori'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'yamashiro',
    setAssignedProv: 'yamashiro',
    setDaimyo: false
  },
  {
    id: 'yoshihira_sagami_1159',
    officerIds: ['off_minamoto_yoshihira'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },
  {
    id: 'tomonaga_shimotsuke_1159',
    officerIds: ['off_minamoto_tomonaga'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'shimotsuke',
    setAssignedProv: 'shimotsuke',
    setDaimyo: false
  },
  {
    id: 'yoritomo_yoshitomo_1159',
    officerIds: ['off_minamoto_yoritomo'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },
  {
    id: 'masakiyo_yoshitomo_1159',
    officerIds: ['off_kamata_masakiyo'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'yamashiro',
    setAssignedProv: 'yamashiro',
    setDaimyo: false
  },
  {
    id: 'minamoto_yoshitaka_1159',
    officerIds: ['off_minamoto_yoshitaka'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'south_shinano',
    setAssignedProv: 'south_shinano',
    setDaimyo: false
  },

  // 1180/1183 島津忠久（薩摩本拠・島津氏当主）
  {
    id: 'shimazu_tadahisa_genpei',
    officerIds: ['off_shimazu_proto_tadahisa'],
    scenarioIds: ['1180', '1183'],
    setClanId: 'shimazu_proto',
    setDefaultProv: 'satsuma',
    setAssignedProv: 'satsuma',
    setDaimyo: true
  },
  // 1180/1183 菊池隆直（肥後本拠・菊池氏当主）
  {
    id: 'kikuchi_takenao_genpei',
    officerIds: ['off_kikuchi_takenao'],
    scenarioIds: ['1180', '1183'],
    setClanId: 'kikuchi',
    setDefaultProv: 'higo',
    setAssignedProv: 'higo',
    setDaimyo: true
  },
  // 1180/1183 菊池氏一族（肥後配置）
  {
    id: 'kikuchi_clan_genpei',
    officerIds: ['off_succ2_kikuchi_1160'],
    scenarioIds: ['1180', '1183'],
    setClanId: 'kikuchi',
    setDefaultProv: 'higo',
    setAssignedProv: 'higo',
    setDaimyo: false
  },
  // 1274 竹崎季長（北条氏・肥後城主）
  {
    id: 'takezaki_suenaga_1274',
    officerIds: ['off_takezaki_suenaga'],
    scenarioIds: ['1274'],
    setClanId: 'hojo_kamakura',
    fromYear: 1274,
    toYear: 1274,
    setDaimyo: false,
    setDefaultProv: 'higo',
    setAssignedProv: 'higo'
  },

  // 1156 保元の乱（崇徳上皇軍）
  {
    id: 'sutoku_daimyo_1156',
    officerIds: ['off_sutoku_in'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: true
  },
  {
    id: 'yorinaga_sutoku_1156',
    officerIds: ['off_fujiwara_yorinaga'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: false
  },
  {
    id: 'tameyoshi_sutoku_1156',
    officerIds: ['off_minamoto_tameyoshi'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'kawachi',
    setAssignedProv: 'kawachi',
    setDaimyo: false
  },
  {
    id: 'tametomo_sutoku_1156',
    officerIds: ['off_minamoto_tametomo'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: false
  },
  {
    id: 'tadamasa_sutoku_1156',
    officerIds: ['off_taira_tadamasa'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: false
  },
  {
    id: 'iehira_sutoku_1156',
    officerIds: ['off_taira_iehira'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: false
  },
  {
    id: 'yorinori_sutoku_1156',
    officerIds: ['off_minamoto_yorinori'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'kawachi',
    setAssignedProv: 'kawachi',
    setDaimyo: false
  },

  // 1156 保元の乱（後白河天皇軍）
  {
    id: 'shinzei_goshirakawa_1156',
    officerIds: ['off_fujiwara_shinzei'],
    scenarioIds: ['1156'],
    setClanId: 'goshirakawa_in',
    setDefaultProv: 'yamashiro',
    setAssignedProv: 'yamashiro',
    setDaimyo: false
  },
  {
    id: 'yorimasa_goshirakawa_1156',
    officerIds: ['off_minamoto_yorimasa'],
    scenarioIds: ['1156'],
    setClanId: 'goshirakawa_in',
    setDefaultProv: 'south_omi',
    setAssignedProv: 'south_omi',
    setDaimyo: false
  },

  // 1156 保元の乱（平氏・源氏）
  {
    id: 'shigemori_taira_1156',
    officerIds: ['off_taira_shigemori'],
    scenarioIds: ['1156', '1159'],
    setClanId: 'taira',
    setDefaultProv: 'ise',
    setAssignedProv: 'ise',
    setDaimyo: false
  },
  {
    id: 'motomori_taira_1156',
    officerIds: ['off_taira_motomori'],
    scenarioIds: ['1156'],
    setClanId: 'taira',
    setDefaultProv: 'aki',
    setAssignedProv: 'aki',
    setDaimyo: false
  },
  {
    id: 'motomori_taira_1159',
    officerIds: ['off_taira_motomori'],
    scenarioIds: ['1159'],
    setClanId: 'taira',
    setDefaultProv: 'chikuzen',
    setAssignedProv: 'chikuzen',
    setDaimyo: false
  },
  {
    id: 'munemori_taira_1159',
    officerIds: ['off_taira_munemori'],
    scenarioIds: ['1159'],
    setClanId: 'taira',
    setDefaultProv: 'harima',
    setAssignedProv: 'harima',
    setDaimyo: false
  },
  {
    id: 'yoshiyasu_yoshitomo_1156',
    officerIds: ['off_ashikaga_yoshiyasu'],
    scenarioIds: ['1156'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'shimotsuke',
    setAssignedProv: 'shimotsuke',
    setDaimyo: false
  },
  {
    id: 'yoshihira_yoshitomo_1156',
    officerIds: ['off_minamoto_yoshihira'],
    scenarioIds: ['1156'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },
  {
    id: 'masakiyo_yoshitomo_1156',
    officerIds: ['off_kamata_masakiyo'],
    scenarioIds: ['1156'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },

  // 1159 平治の乱（源義朝軍）
  {
    id: 'nobuyori_yamashiro_1159',
    officerIds: ['off_fujiwara_nobuyori'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'yamashiro',
    setAssignedProv: 'yamashiro',
    setDaimyo: false
  },
  {
    id: 'yoshihira_sagami_1159',
    officerIds: ['off_minamoto_yoshihira'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },
  {
    id: 'tomonaga_shimotsuke_1159',
    officerIds: ['off_minamoto_tomonaga'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'shimotsuke',
    setAssignedProv: 'shimotsuke',
    setDaimyo: false
  },
  {
    id: 'yoritomo_yoshitomo_1159',
    officerIds: ['off_minamoto_yoritomo'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },
  {
    id: 'masakiyo_yoshitomo_1159',
    officerIds: ['off_kamata_masakiyo'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'yamashiro',
    setAssignedProv: 'yamashiro',
    setDaimyo: false
  },
  {
    id: 'minamoto_yoshitaka_1159',
    officerIds: ['off_minamoto_yoshitaka'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'south_shinano',
    setAssignedProv: 'south_shinano',
    setDaimyo: false
  },

  // 1180/1183 島津忠久（薩摩本拠・島津氏当主）
  {
    id: 'shimazu_tadahisa_genpei',
    officerIds: ['off_shimazu_proto_tadahisa'],
    scenarioIds: ['1180', '1183'],
    setClanId: 'shimazu_proto',
    setDefaultProv: 'satsuma',
    setAssignedProv: 'satsuma',
    setDaimyo: true
  },
  // 1180/1183 菊池隆直（肥後本拠・菊池氏当主）
  {
    id: 'kikuchi_takenao_genpei',
    officerIds: ['off_kikuchi_takenao'],
    scenarioIds: ['1180', '1183'],
    setClanId: 'kikuchi',
    setDefaultProv: 'higo',
    setAssignedProv: 'higo',
    setDaimyo: true
  },
  // 1180/1183 菊池氏一族（肥後配置）
  {
    id: 'kikuchi_clan_genpei',
    officerIds: ['off_succ2_kikuchi_1160'],
    scenarioIds: ['1180', '1183'],
    setClanId: 'kikuchi',
    setDefaultProv: 'higo',
    setAssignedProv: 'higo',
    setDaimyo: false
  },
  // 1274 竹崎季長（北条氏・肥後城主）
  {
    id: 'takezaki_suenaga_1274',
    officerIds: ['off_takezaki_suenaga'],
    scenarioIds: ['1274'],
    setClanId: 'hojo_kamakura',
    fromYear: 1274,
    toYear: 1274,
    setDaimyo: false,
    setDefaultProv: 'higo',
    setAssignedProv: 'higo'
  },

  // 1156 保元の乱（崇徳上皇軍）
  {
    id: 'sutoku_daimyo_1156',
    officerIds: ['off_sutoku_in'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: true
  },
  {
    id: 'yorinaga_sutoku_1156',
    officerIds: ['off_fujiwara_yorinaga'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: false
  },
  {
    id: 'tameyoshi_sutoku_1156',
    officerIds: ['off_minamoto_tameyoshi'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'kawachi',
    setAssignedProv: 'kawachi',
    setDaimyo: false
  },
  {
    id: 'tametomo_sutoku_1156',
    officerIds: ['off_minamoto_tametomo'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: false
  },
  {
    id: 'tadamasa_sutoku_1156',
    officerIds: ['off_taira_tadamasa'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: false
  },
  {
    id: 'iehira_sutoku_1156',
    officerIds: ['off_taira_iehira'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: false
  },
  {
    id: 'yorinori_sutoku_1156',
    officerIds: ['off_minamoto_yorinori'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'kawachi',
    setAssignedProv: 'kawachi',
    setDaimyo: false
  },

  // 1156 保元の乱（後白河天皇軍）
  {
    id: 'shinzei_goshirakawa_1156',
    officerIds: ['off_fujiwara_shinzei'],
    scenarioIds: ['1156'],
    setClanId: 'goshirakawa_in',
    setDefaultProv: 'yamashiro',
    setAssignedProv: 'yamashiro',
    setDaimyo: false
  },
  {
    id: 'yorimasa_goshirakawa_1156',
    officerIds: ['off_minamoto_yorimasa'],
    scenarioIds: ['1156'],
    setClanId: 'goshirakawa_in',
    setDefaultProv: 'south_omi',
    setAssignedProv: 'south_omi',
    setDaimyo: false
  },

  // 1156 保元の乱（平氏・源氏）
  {
    id: 'shigemori_taira_1156',
    officerIds: ['off_taira_shigemori'],
    scenarioIds: ['1156', '1159'],
    setClanId: 'taira',
    setDefaultProv: 'ise',
    setAssignedProv: 'ise',
    setDaimyo: false
  },
  {
    id: 'motomori_taira_1156',
    officerIds: ['off_taira_motomori'],
    scenarioIds: ['1156'],
    setClanId: 'taira',
    setDefaultProv: 'aki',
    setAssignedProv: 'aki',
    setDaimyo: false
  },
  {
    id: 'motomori_taira_1159',
    officerIds: ['off_taira_motomori'],
    scenarioIds: ['1159'],
    setClanId: 'taira',
    setDefaultProv: 'chikuzen',
    setAssignedProv: 'chikuzen',
    setDaimyo: false
  },
  {
    id: 'munemori_taira_1159',
    officerIds: ['off_taira_munemori'],
    scenarioIds: ['1159'],
    setClanId: 'taira',
    setDefaultProv: 'harima',
    setAssignedProv: 'harima',
    setDaimyo: false
  },
  {
    id: 'yoshiyasu_yoshitomo_1156',
    officerIds: ['off_ashikaga_yoshiyasu'],
    scenarioIds: ['1156'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'shimotsuke',
    setAssignedProv: 'shimotsuke',
    setDaimyo: false
  },
  {
    id: 'yoshihira_yoshitomo_1156',
    officerIds: ['off_minamoto_yoshihira'],
    scenarioIds: ['1156'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },
  {
    id: 'masakiyo_yoshitomo_1156',
    officerIds: ['off_kamata_masakiyo'],
    scenarioIds: ['1156'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },

  // 1159 平治の乱（源義朝軍）
  {
    id: 'nobuyori_yamashiro_1159',
    officerIds: ['off_fujiwara_nobuyori'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'yamashiro',
    setAssignedProv: 'yamashiro',
    setDaimyo: false
  },
  {
    id: 'yoshihira_sagami_1159',
    officerIds: ['off_minamoto_yoshihira'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },
  {
    id: 'tomonaga_shimotsuke_1159',
    officerIds: ['off_minamoto_tomonaga'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'shimotsuke',
    setAssignedProv: 'shimotsuke',
    setDaimyo: false
  },
  {
    id: 'yoritomo_yoshitomo_1159',
    officerIds: ['off_minamoto_yoritomo'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },
  {
    id: 'masakiyo_yoshitomo_1159',
    officerIds: ['off_kamata_masakiyo'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'yamashiro',
    setAssignedProv: 'yamashiro',
    setDaimyo: false
  },
  {
    id: 'minamoto_yoshitaka_1159',
    officerIds: ['off_minamoto_yoshitaka'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'south_shinano',
    setAssignedProv: 'south_shinano',
    setDaimyo: false
  },

  // 1180/1183 島津忠久（薩摩本拠・島津氏当主）
  {
    id: 'shimazu_tadahisa_genpei',
    officerIds: ['off_shimazu_proto_tadahisa'],
    scenarioIds: ['1180', '1183'],
    setClanId: 'shimazu_proto',
    setDefaultProv: 'satsuma',
    setAssignedProv: 'satsuma',
    setDaimyo: true
  },
  // 1180/1183 菊池隆直（肥後本拠・菊池氏当主）
  {
    id: 'kikuchi_takenao_genpei',
    officerIds: ['off_kikuchi_takenao'],
    scenarioIds: ['1180', '1183'],
    setClanId: 'kikuchi',
    setDefaultProv: 'higo',
    setAssignedProv: 'higo',
    setDaimyo: true
  },
  // 1180/1183 菊池氏一族（肥後配置）
  {
    id: 'kikuchi_clan_genpei',
    officerIds: ['off_succ2_kikuchi_1160'],
    scenarioIds: ['1180', '1183'],
    setClanId: 'kikuchi',
    setDefaultProv: 'higo',
    setAssignedProv: 'higo',
    setDaimyo: false
  },
  // 1274 竹崎季長（北条氏・肥後城主）
  {
    id: 'takezaki_suenaga_1274',
    officerIds: ['off_takezaki_suenaga'],
    scenarioIds: ['1274'],
    setClanId: 'hojo_kamakura',
    fromYear: 1274,
    toYear: 1274,
    setDaimyo: false,
    setDefaultProv: 'higo',
    setAssignedProv: 'higo'
  },

  // 1156 保元の乱（崇徳上皇軍）
  {
    id: 'sutoku_daimyo_1156',
    officerIds: ['off_sutoku_in'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: true
  },
  {
    id: 'yorinaga_sutoku_1156',
    officerIds: ['off_fujiwara_yorinaga'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: false
  },
  {
    id: 'tameyoshi_sutoku_1156',
    officerIds: ['off_minamoto_tameyoshi'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'kawachi',
    setAssignedProv: 'kawachi',
    setDaimyo: false
  },
  {
    id: 'tametomo_sutoku_1156',
    officerIds: ['off_minamoto_tametomo'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: false
  },
  {
    id: 'tadamasa_sutoku_1156',
    officerIds: ['off_taira_tadamasa'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: false
  },
  {
    id: 'iehira_sutoku_1156',
    officerIds: ['off_taira_iehira'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: false
  },
  {
    id: 'yorinori_sutoku_1156',
    officerIds: ['off_minamoto_yorinori'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'kawachi',
    setAssignedProv: 'kawachi',
    setDaimyo: false
  },

  // 1156 保元の乱（後白河天皇軍）
  {
    id: 'shinzei_goshirakawa_1156',
    officerIds: ['off_fujiwara_shinzei'],
    scenarioIds: ['1156'],
    setClanId: 'goshirakawa_in',
    setDefaultProv: 'yamashiro',
    setAssignedProv: 'yamashiro',
    setDaimyo: false
  },
  {
    id: 'yorimasa_goshirakawa_1156',
    officerIds: ['off_minamoto_yorimasa'],
    scenarioIds: ['1156'],
    setClanId: 'goshirakawa_in',
    setDefaultProv: 'south_omi',
    setAssignedProv: 'south_omi',
    setDaimyo: false
  },

  // 1156 保元の乱（平氏・源氏）
  {
    id: 'shigemori_taira_1156',
    officerIds: ['off_taira_shigemori'],
    scenarioIds: ['1156', '1159'],
    setClanId: 'taira',
    setDefaultProv: 'ise',
    setAssignedProv: 'ise',
    setDaimyo: false
  },
  {
    id: 'motomori_taira_1156',
    officerIds: ['off_taira_motomori'],
    scenarioIds: ['1156'],
    setClanId: 'taira',
    setDefaultProv: 'aki',
    setAssignedProv: 'aki',
    setDaimyo: false
  },
  {
    id: 'motomori_taira_1159',
    officerIds: ['off_taira_motomori'],
    scenarioIds: ['1159'],
    setClanId: 'taira',
    setDefaultProv: 'chikuzen',
    setAssignedProv: 'chikuzen',
    setDaimyo: false
  },
  {
    id: 'munemori_taira_1159',
    officerIds: ['off_taira_munemori'],
    scenarioIds: ['1159'],
    setClanId: 'taira',
    setDefaultProv: 'harima',
    setAssignedProv: 'harima',
    setDaimyo: false
  },
  {
    id: 'yoshiyasu_yoshitomo_1156',
    officerIds: ['off_ashikaga_yoshiyasu'],
    scenarioIds: ['1156'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'shimotsuke',
    setAssignedProv: 'shimotsuke',
    setDaimyo: false
  },
  {
    id: 'yoshihira_yoshitomo_1156',
    officerIds: ['off_minamoto_yoshihira'],
    scenarioIds: ['1156'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },
  {
    id: 'masakiyo_yoshitomo_1156',
    officerIds: ['off_kamata_masakiyo'],
    scenarioIds: ['1156'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },

  // 1159 平治の乱（源義朝軍）
  {
    id: 'nobuyori_yamashiro_1159',
    officerIds: ['off_fujiwara_nobuyori'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'yamashiro',
    setAssignedProv: 'yamashiro',
    setDaimyo: false
  },
  {
    id: 'yoshihira_sagami_1159',
    officerIds: ['off_minamoto_yoshihira'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },
  {
    id: 'tomonaga_shimotsuke_1159',
    officerIds: ['off_minamoto_tomonaga'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'shimotsuke',
    setAssignedProv: 'shimotsuke',
    setDaimyo: false
  },
  {
    id: 'yoritomo_yoshitomo_1159',
    officerIds: ['off_minamoto_yoritomo'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },
  {
    id: 'masakiyo_yoshitomo_1159',
    officerIds: ['off_kamata_masakiyo'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'yamashiro',
    setAssignedProv: 'yamashiro',
    setDaimyo: false
  },
  {
    id: 'minamoto_yoshitaka_1159',
    officerIds: ['off_minamoto_yoshitaka'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'south_shinano',
    setAssignedProv: 'south_shinano',
    setDaimyo: false
  },

  // 1180/1183 島津忠久（薩摩本拠・島津氏当主）
  {
    id: 'shimazu_tadahisa_genpei',
    officerIds: ['off_shimazu_proto_tadahisa'],
    scenarioIds: ['1180', '1183'],
    setClanId: 'shimazu_proto',
    setDefaultProv: 'satsuma',
    setAssignedProv: 'satsuma',
    setDaimyo: true
  },
  // 1180/1183 菊池隆直（肥後本拠・菊池氏当主）
  {
    id: 'kikuchi_takenao_genpei',
    officerIds: ['off_kikuchi_takenao'],
    scenarioIds: ['1180', '1183'],
    setClanId: 'kikuchi',
    setDefaultProv: 'higo',
    setAssignedProv: 'higo',
    setDaimyo: true
  },
  // 1180/1183 菊池氏一族（肥後配置）
  {
    id: 'kikuchi_clan_genpei',
    officerIds: ['off_succ2_kikuchi_1160'],
    scenarioIds: ['1180', '1183'],
    setClanId: 'kikuchi',
    setDefaultProv: 'higo',
    setAssignedProv: 'higo',
    setDaimyo: false
  },
  // 1274 竹崎季長（北条氏・肥後城主）
  {
    id: 'takezaki_suenaga_1274',
    officerIds: ['off_takezaki_suenaga'],
    scenarioIds: ['1274'],
    setClanId: 'hojo_kamakura',
    fromYear: 1274,
    toYear: 1274,
    setDaimyo: false,
    setDefaultProv: 'higo',
    setAssignedProv: 'higo'
  },

  // 1156 保元の乱（崇徳上皇軍）
  {
    id: 'sutoku_daimyo_1156',
    officerIds: ['off_sutoku_in'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: true
  },
  {
    id: 'yorinaga_sutoku_1156',
    officerIds: ['off_fujiwara_yorinaga'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: false
  },
  {
    id: 'tameyoshi_sutoku_1156',
    officerIds: ['off_minamoto_tameyoshi'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'kawachi',
    setAssignedProv: 'kawachi',
    setDaimyo: false
  },
  {
    id: 'tametomo_sutoku_1156',
    officerIds: ['off_minamoto_tametomo'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: false
  },
  {
    id: 'tadamasa_sutoku_1156',
    officerIds: ['off_taira_tadamasa'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: false
  },
  {
    id: 'iehira_sutoku_1156',
    officerIds: ['off_taira_iehira'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: false
  },
  {
    id: 'yorinori_sutoku_1156',
    officerIds: ['off_minamoto_yorinori'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'kawachi',
    setAssignedProv: 'kawachi',
    setDaimyo: false
  },

  // 1156 保元の乱（後白河天皇軍）
  {
    id: 'shinzei_goshirakawa_1156',
    officerIds: ['off_fujiwara_shinzei'],
    scenarioIds: ['1156'],
    setClanId: 'goshirakawa_in',
    setDefaultProv: 'yamashiro',
    setAssignedProv: 'yamashiro',
    setDaimyo: false
  },
  {
    id: 'yorimasa_goshirakawa_1156',
    officerIds: ['off_minamoto_yorimasa'],
    scenarioIds: ['1156'],
    setClanId: 'goshirakawa_in',
    setDefaultProv: 'south_omi',
    setAssignedProv: 'south_omi',
    setDaimyo: false
  },

  // 1156 保元の乱（平氏・源氏）
  {
    id: 'shigemori_taira_1156',
    officerIds: ['off_taira_shigemori'],
    scenarioIds: ['1156', '1159'],
    setClanId: 'taira',
    setDefaultProv: 'ise',
    setAssignedProv: 'ise',
    setDaimyo: false
  },
  {
    id: 'motomori_taira_1156',
    officerIds: ['off_taira_motomori'],
    scenarioIds: ['1156'],
    setClanId: 'taira',
    setDefaultProv: 'aki',
    setAssignedProv: 'aki',
    setDaimyo: false
  },
  {
    id: 'motomori_taira_1159',
    officerIds: ['off_taira_motomori'],
    scenarioIds: ['1159'],
    setClanId: 'taira',
    setDefaultProv: 'chikuzen',
    setAssignedProv: 'chikuzen',
    setDaimyo: false
  },
  {
    id: 'munemori_taira_1159',
    officerIds: ['off_taira_munemori'],
    scenarioIds: ['1159'],
    setClanId: 'taira',
    setDefaultProv: 'harima',
    setAssignedProv: 'harima',
    setDaimyo: false
  },
  {
    id: 'yoshiyasu_yoshitomo_1156',
    officerIds: ['off_ashikaga_yoshiyasu'],
    scenarioIds: ['1156'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'shimotsuke',
    setAssignedProv: 'shimotsuke',
    setDaimyo: false
  },
  {
    id: 'yoshihira_yoshitomo_1156',
    officerIds: ['off_minamoto_yoshihira'],
    scenarioIds: ['1156'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },
  {
    id: 'masakiyo_yoshitomo_1156',
    officerIds: ['off_kamata_masakiyo'],
    scenarioIds: ['1156'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },

  // 1159 平治の乱（源義朝軍）
  {
    id: 'nobuyori_yamashiro_1159',
    officerIds: ['off_fujiwara_nobuyori'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'yamashiro',
    setAssignedProv: 'yamashiro',
    setDaimyo: false
  },
  {
    id: 'yoshihira_sagami_1159',
    officerIds: ['off_minamoto_yoshihira'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },
  {
    id: 'tomonaga_shimotsuke_1159',
    officerIds: ['off_minamoto_tomonaga'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'shimotsuke',
    setAssignedProv: 'shimotsuke',
    setDaimyo: false
  },
  {
    id: 'yoritomo_yoshitomo_1159',
    officerIds: ['off_minamoto_yoritomo'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },
  {
    id: 'masakiyo_yoshitomo_1159',
    officerIds: ['off_kamata_masakiyo'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'yamashiro',
    setAssignedProv: 'yamashiro',
    setDaimyo: false
  },
  {
    id: 'minamoto_yoshitaka_1159',
    officerIds: ['off_minamoto_yoshitaka'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'south_shinano',
    setAssignedProv: 'south_shinano',
    setDaimyo: false
  },

  // 1180/1183 島津忠久（薩摩本拠・島津氏当主）
  {
    id: 'shimazu_tadahisa_genpei',
    officerIds: ['off_shimazu_proto_tadahisa'],
    scenarioIds: ['1180', '1183'],
    setClanId: 'shimazu_proto',
    setDefaultProv: 'satsuma',
    setAssignedProv: 'satsuma',
    setDaimyo: true
  },
  // 1180/1183 菊池隆直（肥後本拠・菊池氏当主）
  {
    id: 'kikuchi_takenao_genpei',
    officerIds: ['off_kikuchi_takenao'],
    scenarioIds: ['1180', '1183'],
    setClanId: 'kikuchi',
    setDefaultProv: 'higo',
    setAssignedProv: 'higo',
    setDaimyo: true
  },
  // 1180/1183 菊池氏一族（肥後配置）
  {
    id: 'kikuchi_clan_genpei',
    officerIds: ['off_succ2_kikuchi_1160'],
    scenarioIds: ['1180', '1183'],
    setClanId: 'kikuchi',
    setDefaultProv: 'higo',
    setAssignedProv: 'higo',
    setDaimyo: false
  },
  // 1274 竹崎季長（北条氏・肥後城主）
  {
    id: 'takezaki_suenaga_1274',
    officerIds: ['off_takezaki_suenaga'],
    scenarioIds: ['1274'],
    setClanId: 'hojo_kamakura',
    fromYear: 1274,
    toYear: 1274,
    setDaimyo: false,
    setDefaultProv: 'higo',
    setAssignedProv: 'higo'
  },

  // 1156 保元の乱（崇徳上皇軍）
  {
    id: 'sutoku_daimyo_1156',
    officerIds: ['off_sutoku_in'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: true
  },
  {
    id: 'yorinaga_sutoku_1156',
    officerIds: ['off_fujiwara_yorinaga'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: false
  },
  {
    id: 'tameyoshi_sutoku_1156',
    officerIds: ['off_minamoto_tameyoshi'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'kawachi',
    setAssignedProv: 'kawachi',
    setDaimyo: false
  },
  {
    id: 'tametomo_sutoku_1156',
    officerIds: ['off_minamoto_tametomo'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: false
  },
  {
    id: 'tadamasa_sutoku_1156',
    officerIds: ['off_taira_tadamasa'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: false
  },
  {
    id: 'iehira_sutoku_1156',
    officerIds: ['off_taira_iehira'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: false
  },
  {
    id: 'yorinori_sutoku_1156',
    officerIds: ['off_minamoto_yorinori'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'kawachi',
    setAssignedProv: 'kawachi',
    setDaimyo: false
  },

  // 1156 保元の乱（後白河天皇軍）
  {
    id: 'shinzei_goshirakawa_1156',
    officerIds: ['off_fujiwara_shinzei'],
    scenarioIds: ['1156'],
    setClanId: 'goshirakawa_in',
    setDefaultProv: 'yamashiro',
    setAssignedProv: 'yamashiro',
    setDaimyo: false
  },
  {
    id: 'yorimasa_goshirakawa_1156',
    officerIds: ['off_minamoto_yorimasa'],
    scenarioIds: ['1156'],
    setClanId: 'goshirakawa_in',
    setDefaultProv: 'south_omi',
    setAssignedProv: 'south_omi',
    setDaimyo: false
  },

  // 1156 保元の乱（平氏・源氏）
  {
    id: 'shigemori_taira_1156',
    officerIds: ['off_taira_shigemori'],
    scenarioIds: ['1156', '1159'],
    setClanId: 'taira',
    setDefaultProv: 'ise',
    setAssignedProv: 'ise',
    setDaimyo: false
  },
  {
    id: 'motomori_taira_1156',
    officerIds: ['off_taira_motomori'],
    scenarioIds: ['1156'],
    setClanId: 'taira',
    setDefaultProv: 'aki',
    setAssignedProv: 'aki',
    setDaimyo: false
  },
  {
    id: 'motomori_taira_1159',
    officerIds: ['off_taira_motomori'],
    scenarioIds: ['1159'],
    setClanId: 'taira',
    setDefaultProv: 'chikuzen',
    setAssignedProv: 'chikuzen',
    setDaimyo: false
  },
  {
    id: 'munemori_taira_1159',
    officerIds: ['off_taira_munemori'],
    scenarioIds: ['1159'],
    setClanId: 'taira',
    setDefaultProv: 'harima',
    setAssignedProv: 'harima',
    setDaimyo: false
  },
  {
    id: 'yoshiyasu_yoshitomo_1156',
    officerIds: ['off_ashikaga_yoshiyasu'],
    scenarioIds: ['1156'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'shimotsuke',
    setAssignedProv: 'shimotsuke',
    setDaimyo: false
  },
  {
    id: 'yoshihira_yoshitomo_1156',
    officerIds: ['off_minamoto_yoshihira'],
    scenarioIds: ['1156'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },
  {
    id: 'masakiyo_yoshitomo_1156',
    officerIds: ['off_kamata_masakiyo'],
    scenarioIds: ['1156'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },

  // 1159 平治の乱（源義朝軍）
  {
    id: 'nobuyori_yamashiro_1159',
    officerIds: ['off_fujiwara_nobuyori'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'yamashiro',
    setAssignedProv: 'yamashiro',
    setDaimyo: false
  },
  {
    id: 'yoshihira_sagami_1159',
    officerIds: ['off_minamoto_yoshihira'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },
  {
    id: 'tomonaga_shimotsuke_1159',
    officerIds: ['off_minamoto_tomonaga'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'shimotsuke',
    setAssignedProv: 'shimotsuke',
    setDaimyo: false
  },
  {
    id: 'yoritomo_yoshitomo_1159',
    officerIds: ['off_minamoto_yoritomo'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },
  {
    id: 'masakiyo_yoshitomo_1159',
    officerIds: ['off_kamata_masakiyo'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'yamashiro',
    setAssignedProv: 'yamashiro',
    setDaimyo: false
  },
  {
    id: 'minamoto_yoshitaka_1159',
    officerIds: ['off_minamoto_yoshitaka'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'south_shinano',
    setAssignedProv: 'south_shinano',
    setDaimyo: false
  },

  // 1180/1183 島津忠久（薩摩本拠・島津氏当主）
  {
    id: 'shimazu_tadahisa_genpei',
    officerIds: ['off_shimazu_proto_tadahisa'],
    scenarioIds: ['1180', '1183'],
    setClanId: 'shimazu_proto',
    setDefaultProv: 'satsuma',
    setAssignedProv: 'satsuma',
    setDaimyo: true
  },
  // 1180/1183 菊池隆直（肥後本拠・菊池氏当主）
  {
    id: 'kikuchi_takenao_genpei',
    officerIds: ['off_kikuchi_takenao'],
    scenarioIds: ['1180', '1183'],
    setClanId: 'kikuchi',
    setDefaultProv: 'higo',
    setAssignedProv: 'higo',
    setDaimyo: true
  },
  // 1180/1183 菊池氏一族（肥後配置）
  {
    id: 'kikuchi_clan_genpei',
    officerIds: ['off_succ2_kikuchi_1160'],
    scenarioIds: ['1180', '1183'],
    setClanId: 'kikuchi',
    setDefaultProv: 'higo',
    setAssignedProv: 'higo',
    setDaimyo: false
  },

  // 1180 木曽義仲（南信濃本拠・木曽氏当主）
  {
    id: 'kiso_yoshinaka_daimyo_1180',
    officerIds: ['off_kiso_yoshinaka'],
    scenarioIds: ['1180'],
    setClanId: 'kiso',
    setDefaultProv: 'south_shinano',
    setAssignedProv: 'south_shinano',
    setDaimyo: true
  },
  // 1183 平宗盛（平氏当主・摂津配置）
  {
    id: 'taira_munemori_settsu_1183',
    officerIds: ['off_taira_munemori'],
    scenarioIds: ['1183'],
    setClanId: 'taira',
    setDefaultProv: 'settsu',
    setAssignedProv: 'settsu',
    setDaimyo: true
  },
  // 1183 木曽領からの平氏退去（摂津配置）
  {
    id: 'taira_evacuate_settsu_1183',
    officerIds: [
      'off_jd_360',
      'off_taira_norimori',
      'off_taira_kagekiyo',
      'off_jd_005',
      'off_taira_tsunemori',
      'off_taira_sukemori',
      'off_sadamori_tokitada',
      'off_taira_moritsuna',
      'off_taira_morikuni',
      'off_jd_003',
      'off_taira_yorimori_1156',
      'off_taira_rokudai'
    ],
    scenarioIds: ['1183'],
    setClanId: 'taira',
    setDefaultProv: 'settsu',
    setAssignedProv: 'settsu',
    setDaimyo: false
  },
  // 1184 平宗盛（平氏当主・摂津配置）
  {
    id: 'taira_munemori_settsu_1184',
    officerIds: ['off_taira_munemori'],
    scenarioIds: ['1184'],
    setClanId: 'taira',
    setDefaultProv: 'settsu',
    setAssignedProv: 'settsu',
    setDaimyo: true
  },
  // 1184 鎌倉源氏領からの平氏退去（摂津配置）
  {
    id: 'taira_evacuate_settsu_1184',
    officerIds: [
      'off_jd_360',
      'off_jd_359',
      'off_taira_koremori',
      'off_taira_norimori',
      'off_taira_kagekiyo',
      'off_jd_005',
      'off_taira_tsunemori',
      'off_taira_sukemori',
      'off_sadamori_tokitada',
      'off_taira_shigehira',
      'off_taira_moritsuna',
      'off_taira_morikuni',
      'off_jd_003',
      'off_taira_yorimori_1156',
      'off_taira_rokudai'
    ],
    scenarioIds: ['1184'],
    setClanId: 'taira',
    setDefaultProv: 'settsu',
    setAssignedProv: 'settsu',
    setDaimyo: false
  },
  // 1185 鎌倉源氏・源義経領からの平氏退去（周防配置）
  {
    id: 'taira_evacuate_suo_1185',
    officerIds: [
      'off_taguchi_noriyoshi_1156',
      'off_taguchi_shigeyoshi',
      'off_taira_noritsune',
      'off_taira_norimori',
      'off_taira_kagekiyo',
      'off_taira_tsunemori',
      'off_taira_sukemori',
      'off_sadamori_tokitada',
      'off_taira_munemori',
      'off_taira_shigehira',
      'off_taira_moritsuna',
      'off_taira_morikuni',
      'off_taira_yorimori_1156',
      'off_taira_rokudai'
    ],
    scenarioIds: ['1185'],
    setClanId: 'taira',
    setDefaultProv: 'suo',
    setAssignedProv: 'suo',
    setDaimyo: false
  },
  // 1189 三浦義村（相模配置・鎌倉源氏配下）
  {
    id: 'miura_yoshimura_genji_1189',
    officerIds: ['off_miura_yoshimura'],
    scenarioIds: ['1189'],
    setClanId: 'genji_yoritomo',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },

  // 1274 竹崎季長（北条氏・肥後城主）
  {
    id: 'takezaki_suenaga_1274',
    officerIds: ['off_takezaki_suenaga'],
    scenarioIds: ['1274'],
    setClanId: 'hojo_kamakura',
    fromYear: 1274,
    toYear: 1274,
    setDaimyo: false,
    setDefaultProv: 'higo',
    setAssignedProv: 'higo'
  },

  // 1331 富樫氏（加賀・北条氏配下）
  {
    id: 'togashi_hojo_1331',
    officerIds: ['off_dm_togashi_1333', 'off_togashi_ujiharu'],
    scenarioIds: ['1331'],
    setClanId: 'hojo_kamakura',
    setDefaultProv: 'kaga',
    setAssignedProv: 'kaga',
    setDaimyo: false
  },
  // 1333 小笠原貞宗・小笠原長氏（南信濃配置・小笠原氏）
  {
    id: 'ogasawara_sadamune_nagauji_1333',
    officerIds: ['off_ogasawara_sadamune', 'off_succ_ogasawara_1275_111'],
    scenarioIds: ['1333'],
    setClanId: 'ogasawara',
    setDefaultProv: 'south_shinano',
    setAssignedProv: 'south_shinano',
    setDaimyo: false
  },
  // 1333 小笠原貞宗（南信濃当主）
  {
    id: 'ogasawara_sadamune_daimyo_1333',
    officerIds: ['off_ogasawara_sadamune'],
    scenarioIds: ['1333'],
    setClanId: 'ogasawara',
    setDefaultProv: 'south_shinano',
    setAssignedProv: 'south_shinano',
    setDaimyo: true
  },
  // 1331 諏訪頼重（諏訪氏惣領・大祝家、南信濃）
  {
    id: 'suwa_yorishige_south_shinano_1331',
    officerIds: ['off_suwa_yorishige_kama'],
    scenarioIds: ['1331'],
    setClanId: 'suwa',
    setDefaultProv: 'south_shinano',
    setAssignedProv: 'south_shinano',
    setDaimyo: true
  },
  // 1333 村上国清（北信濃独立大名）
  {
    id: 'murakami_kunikiyo_daimyo_1333',
    officerIds: ['off_succ_murakami_1300_98'],
    scenarioIds: ['1333'],
    setClanId: 'murakami',
    setDefaultProv: 'north_shinano',
    setAssignedProv: 'north_shinano',
    setDaimyo: true
  },

  // 1336 小笠原貞宗・小笠原政長（南信濃配置・小笠原氏）
  {
    id: 'ogasawara_sadamune_masanaga_1336',
    officerIds: ['off_ogasawara_sadamune', 'off_ogasawara_naganori'],
    scenarioIds: ['1336'],
    setClanId: 'ogasawara',
    setDefaultProv: 'south_shinano',
    setAssignedProv: 'south_shinano',
    setDaimyo: false
  },
  // 1336 小笠原貞宗（南信濃当主）
  {
    id: 'ogasawara_sadamune_daimyo_1336',
    officerIds: ['off_ogasawara_sadamune'],
    scenarioIds: ['1336'],
    setClanId: 'ogasawara',
    setDefaultProv: 'south_shinano',
    setAssignedProv: 'south_shinano',
    setDaimyo: true
  },
  // 1336 村上国清（北信濃独立大名）
  {
    id: 'murakami_kunikiyo_daimyo_1336',
    officerIds: ['off_succ_murakami_1300_98'],
    scenarioIds: ['1336'],
    setClanId: 'murakami',
    setDefaultProv: 'north_shinano',
    setAssignedProv: 'north_shinano',
    setDaimyo: true
  },
  // 1336 村上信貞（北信濃・村上氏配下）
  {
    id: 'murakami_nobusada_vassal_1336',
    officerIds: ['off_murakami_nobusada'],
    scenarioIds: ['1336'],
    setClanId: 'murakami',
    setDefaultProv: 'north_shinano',
    setAssignedProv: 'north_shinano',
    setDaimyo: false
  },
  // 1336 斯波家長（陸中・奥州斯波家当主として独立）
  {
    id: 'shiba_ienaga_oshu_1336',
    officerIds: ['off_shiba_ienaga'],
    scenarioIds: ['1336'],
    setClanId: 'shiba_oshu',
    setDefaultProv: 'rikuchu',
    setAssignedProv: 'rikuchu',
    setDaimyo: true
  },

  // 1156 保元の乱（崇徳上皇軍）
  {
    id: 'sutoku_daimyo_1156',
    officerIds: ['off_sutoku_in'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: true
  },
  {
    id: 'yorinaga_sutoku_1156',
    officerIds: ['off_fujiwara_yorinaga'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: false
  },
  {
    id: 'tameyoshi_sutoku_1156',
    officerIds: ['off_minamoto_tameyoshi'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'kawachi',
    setAssignedProv: 'kawachi',
    setDaimyo: false
  },
  {
    id: 'tametomo_sutoku_1156',
    officerIds: ['off_minamoto_tametomo'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: false
  },
  {
    id: 'tadamasa_sutoku_1156',
    officerIds: ['off_taira_tadamasa'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: false
  },
  {
    id: 'iehira_sutoku_1156',
    officerIds: ['off_taira_iehira'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: false
  },
  {
    id: 'yorinori_sutoku_1156',
    officerIds: ['off_minamoto_yorinori'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'kawachi',
    setAssignedProv: 'kawachi',
    setDaimyo: false
  },

  // 1156 保元の乱（後白河天皇軍）
  {
    id: 'shinzei_goshirakawa_1156',
    officerIds: ['off_fujiwara_shinzei'],
    scenarioIds: ['1156'],
    setClanId: 'goshirakawa_in',
    setDefaultProv: 'yamashiro',
    setAssignedProv: 'yamashiro',
    setDaimyo: false
  },
  {
    id: 'yorimasa_goshirakawa_1156',
    officerIds: ['off_minamoto_yorimasa'],
    scenarioIds: ['1156'],
    setClanId: 'goshirakawa_in',
    setDefaultProv: 'south_omi',
    setAssignedProv: 'south_omi',
    setDaimyo: false
  },

  // 1156 保元の乱（平氏・源氏）
  {
    id: 'shigemori_taira_1156',
    officerIds: ['off_taira_shigemori'],
    scenarioIds: ['1156', '1159'],
    setClanId: 'taira',
    setDefaultProv: 'ise',
    setAssignedProv: 'ise',
    setDaimyo: false
  },
  {
    id: 'motomori_taira_1156',
    officerIds: ['off_taira_motomori'],
    scenarioIds: ['1156'],
    setClanId: 'taira',
    setDefaultProv: 'aki',
    setAssignedProv: 'aki',
    setDaimyo: false
  },
  {
    id: 'motomori_taira_1159',
    officerIds: ['off_taira_motomori'],
    scenarioIds: ['1159'],
    setClanId: 'taira',
    setDefaultProv: 'chikuzen',
    setAssignedProv: 'chikuzen',
    setDaimyo: false
  },
  {
    id: 'munemori_taira_1159',
    officerIds: ['off_taira_munemori'],
    scenarioIds: ['1159'],
    setClanId: 'taira',
    setDefaultProv: 'harima',
    setAssignedProv: 'harima',
    setDaimyo: false
  },
  {
    id: 'yoshiyasu_yoshitomo_1156',
    officerIds: ['off_ashikaga_yoshiyasu'],
    scenarioIds: ['1156'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'shimotsuke',
    setAssignedProv: 'shimotsuke',
    setDaimyo: false
  },
  {
    id: 'yoshihira_yoshitomo_1156',
    officerIds: ['off_minamoto_yoshihira'],
    scenarioIds: ['1156'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },
  {
    id: 'masakiyo_yoshitomo_1156',
    officerIds: ['off_kamata_masakiyo'],
    scenarioIds: ['1156'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },

  // 1159 平治の乱（源義朝軍）
  {
    id: 'nobuyori_yamashiro_1159',
    officerIds: ['off_fujiwara_nobuyori'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'yamashiro',
    setAssignedProv: 'yamashiro',
    setDaimyo: false
  },
  {
    id: 'yoshihira_sagami_1159',
    officerIds: ['off_minamoto_yoshihira'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },
  {
    id: 'tomonaga_shimotsuke_1159',
    officerIds: ['off_minamoto_tomonaga'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'shimotsuke',
    setAssignedProv: 'shimotsuke',
    setDaimyo: false
  },
  {
    id: 'yoritomo_yoshitomo_1159',
    officerIds: ['off_minamoto_yoritomo'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },
  {
    id: 'masakiyo_yoshitomo_1159',
    officerIds: ['off_kamata_masakiyo'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'yamashiro',
    setAssignedProv: 'yamashiro',
    setDaimyo: false
  },
  {
    id: 'minamoto_yoshitaka_1159',
    officerIds: ['off_minamoto_yoshitaka'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'south_shinano',
    setAssignedProv: 'south_shinano',
    setDaimyo: false
  },

  // 1180/1183 島津忠久（薩摩本拠・島津氏当主）
  {
    id: 'shimazu_tadahisa_genpei',
    officerIds: ['off_shimazu_proto_tadahisa'],
    scenarioIds: ['1180', '1183'],
    setClanId: 'shimazu_proto',
    setDefaultProv: 'satsuma',
    setAssignedProv: 'satsuma',
    setDaimyo: true
  },
  // 1180/1183 菊池隆直（肥後本拠・菊池氏当主）
  {
    id: 'kikuchi_takenao_genpei',
    officerIds: ['off_kikuchi_takenao'],
    scenarioIds: ['1180', '1183'],
    setClanId: 'kikuchi',
    setDefaultProv: 'higo',
    setAssignedProv: 'higo',
    setDaimyo: true
  },
  // 1180/1183 菊池氏一族（肥後配置）
  {
    id: 'kikuchi_clan_genpei',
    officerIds: ['off_succ2_kikuchi_1160'],
    scenarioIds: ['1180', '1183'],
    setClanId: 'kikuchi',
    setDefaultProv: 'higo',
    setAssignedProv: 'higo',
    setDaimyo: false
  },
  // 1274 竹崎季長（北条氏・肥後城主）
  {
    id: 'takezaki_suenaga_1274',
    officerIds: ['off_takezaki_suenaga'],
    scenarioIds: ['1274'],
    setClanId: 'hojo_kamakura',
    fromYear: 1274,
    toYear: 1274,
    setDaimyo: false,
    setDefaultProv: 'higo',
    setAssignedProv: 'higo'
  },

  // 1156 保元の乱（崇徳上皇軍）
  {
    id: 'sutoku_daimyo_1156',
    officerIds: ['off_sutoku_in'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: true
  },
  {
    id: 'yorinaga_sutoku_1156',
    officerIds: ['off_fujiwara_yorinaga'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: false
  },
  {
    id: 'tameyoshi_sutoku_1156',
    officerIds: ['off_minamoto_tameyoshi'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'kawachi',
    setAssignedProv: 'kawachi',
    setDaimyo: false
  },
  {
    id: 'tametomo_sutoku_1156',
    officerIds: ['off_minamoto_tametomo'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: false
  },
  {
    id: 'tadamasa_sutoku_1156',
    officerIds: ['off_taira_tadamasa'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: false
  },
  {
    id: 'iehira_sutoku_1156',
    officerIds: ['off_taira_iehira'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: false
  },
  {
    id: 'yorinori_sutoku_1156',
    officerIds: ['off_minamoto_yorinori'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'kawachi',
    setAssignedProv: 'kawachi',
    setDaimyo: false
  },

  // 1156 保元の乱（後白河天皇軍）
  {
    id: 'shinzei_goshirakawa_1156',
    officerIds: ['off_fujiwara_shinzei'],
    scenarioIds: ['1156'],
    setClanId: 'goshirakawa_in',
    setDefaultProv: 'yamashiro',
    setAssignedProv: 'yamashiro',
    setDaimyo: false
  },
  {
    id: 'yorimasa_goshirakawa_1156',
    officerIds: ['off_minamoto_yorimasa'],
    scenarioIds: ['1156'],
    setClanId: 'goshirakawa_in',
    setDefaultProv: 'south_omi',
    setAssignedProv: 'south_omi',
    setDaimyo: false
  },

  // 1156 保元の乱（平氏・源氏）
  {
    id: 'shigemori_taira_1156',
    officerIds: ['off_taira_shigemori'],
    scenarioIds: ['1156', '1159'],
    setClanId: 'taira',
    setDefaultProv: 'ise',
    setAssignedProv: 'ise',
    setDaimyo: false
  },
  {
    id: 'motomori_taira_1156',
    officerIds: ['off_taira_motomori'],
    scenarioIds: ['1156'],
    setClanId: 'taira',
    setDefaultProv: 'aki',
    setAssignedProv: 'aki',
    setDaimyo: false
  },
  {
    id: 'motomori_taira_1159',
    officerIds: ['off_taira_motomori'],
    scenarioIds: ['1159'],
    setClanId: 'taira',
    setDefaultProv: 'chikuzen',
    setAssignedProv: 'chikuzen',
    setDaimyo: false
  },
  {
    id: 'munemori_taira_1159',
    officerIds: ['off_taira_munemori'],
    scenarioIds: ['1159'],
    setClanId: 'taira',
    setDefaultProv: 'harima',
    setAssignedProv: 'harima',
    setDaimyo: false
  },
  {
    id: 'yoshiyasu_yoshitomo_1156',
    officerIds: ['off_ashikaga_yoshiyasu'],
    scenarioIds: ['1156'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'shimotsuke',
    setAssignedProv: 'shimotsuke',
    setDaimyo: false
  },
  {
    id: 'yoshihira_yoshitomo_1156',
    officerIds: ['off_minamoto_yoshihira'],
    scenarioIds: ['1156'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },
  {
    id: 'masakiyo_yoshitomo_1156',
    officerIds: ['off_kamata_masakiyo'],
    scenarioIds: ['1156'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },

  // 1159 平治の乱（源義朝軍）
  {
    id: 'nobuyori_yamashiro_1159',
    officerIds: ['off_fujiwara_nobuyori'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'yamashiro',
    setAssignedProv: 'yamashiro',
    setDaimyo: false
  },
  {
    id: 'yoshihira_sagami_1159',
    officerIds: ['off_minamoto_yoshihira'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },
  {
    id: 'tomonaga_shimotsuke_1159',
    officerIds: ['off_minamoto_tomonaga'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'shimotsuke',
    setAssignedProv: 'shimotsuke',
    setDaimyo: false
  },
  {
    id: 'yoritomo_yoshitomo_1159',
    officerIds: ['off_minamoto_yoritomo'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },
  {
    id: 'masakiyo_yoshitomo_1159',
    officerIds: ['off_kamata_masakiyo'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'yamashiro',
    setAssignedProv: 'yamashiro',
    setDaimyo: false
  },
  {
    id: 'minamoto_yoshitaka_1159',
    officerIds: ['off_minamoto_yoshitaka'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'south_shinano',
    setAssignedProv: 'south_shinano',
    setDaimyo: false
  },

  // 1180/1183 島津忠久（薩摩本拠・島津氏当主）
  {
    id: 'shimazu_tadahisa_genpei',
    officerIds: ['off_shimazu_proto_tadahisa'],
    scenarioIds: ['1180', '1183'],
    setClanId: 'shimazu_proto',
    setDefaultProv: 'satsuma',
    setAssignedProv: 'satsuma',
    setDaimyo: true
  },
  // 1180/1183 菊池隆直（肥後本拠・菊池氏当主）
  {
    id: 'kikuchi_takenao_genpei',
    officerIds: ['off_kikuchi_takenao'],
    scenarioIds: ['1180', '1183'],
    setClanId: 'kikuchi',
    setDefaultProv: 'higo',
    setAssignedProv: 'higo',
    setDaimyo: true
  },
  // 1180/1183 菊池氏一族（肥後配置）
  {
    id: 'kikuchi_clan_genpei',
    officerIds: ['off_succ2_kikuchi_1160'],
    scenarioIds: ['1180', '1183'],
    setClanId: 'kikuchi',
    setDefaultProv: 'higo',
    setAssignedProv: 'higo',
    setDaimyo: false
  },
  // 1274 竹崎季長（北条氏・肥後城主）
  {
    id: 'takezaki_suenaga_1274',
    officerIds: ['off_takezaki_suenaga'],
    scenarioIds: ['1274'],
    setClanId: 'hojo_kamakura',
    fromYear: 1274,
    toYear: 1274,
    setDaimyo: false,
    setDefaultProv: 'higo',
    setAssignedProv: 'higo'
  },

  // 1156 保元の乱（崇徳上皇軍）
  {
    id: 'sutoku_daimyo_1156',
    officerIds: ['off_sutoku_in'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: true
  },
  {
    id: 'yorinaga_sutoku_1156',
    officerIds: ['off_fujiwara_yorinaga'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: false
  },
  {
    id: 'tameyoshi_sutoku_1156',
    officerIds: ['off_minamoto_tameyoshi'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'kawachi',
    setAssignedProv: 'kawachi',
    setDaimyo: false
  },
  {
    id: 'tametomo_sutoku_1156',
    officerIds: ['off_minamoto_tametomo'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: false
  },
  {
    id: 'tadamasa_sutoku_1156',
    officerIds: ['off_taira_tadamasa'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: false
  },
  {
    id: 'iehira_sutoku_1156',
    officerIds: ['off_taira_iehira'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: false
  },
  {
    id: 'yorinori_sutoku_1156',
    officerIds: ['off_minamoto_yorinori'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'kawachi',
    setAssignedProv: 'kawachi',
    setDaimyo: false
  },

  // 1156 保元の乱（後白河天皇軍）
  {
    id: 'shinzei_goshirakawa_1156',
    officerIds: ['off_fujiwara_shinzei'],
    scenarioIds: ['1156'],
    setClanId: 'goshirakawa_in',
    setDefaultProv: 'yamashiro',
    setAssignedProv: 'yamashiro',
    setDaimyo: false
  },
  {
    id: 'yorimasa_goshirakawa_1156',
    officerIds: ['off_minamoto_yorimasa'],
    scenarioIds: ['1156'],
    setClanId: 'goshirakawa_in',
    setDefaultProv: 'south_omi',
    setAssignedProv: 'south_omi',
    setDaimyo: false
  },

  // 1156 保元の乱（平氏・源氏）
  {
    id: 'shigemori_taira_1156',
    officerIds: ['off_taira_shigemori'],
    scenarioIds: ['1156', '1159'],
    setClanId: 'taira',
    setDefaultProv: 'ise',
    setAssignedProv: 'ise',
    setDaimyo: false
  },
  {
    id: 'motomori_taira_1156',
    officerIds: ['off_taira_motomori'],
    scenarioIds: ['1156'],
    setClanId: 'taira',
    setDefaultProv: 'aki',
    setAssignedProv: 'aki',
    setDaimyo: false
  },
  {
    id: 'motomori_taira_1159',
    officerIds: ['off_taira_motomori'],
    scenarioIds: ['1159'],
    setClanId: 'taira',
    setDefaultProv: 'chikuzen',
    setAssignedProv: 'chikuzen',
    setDaimyo: false
  },
  {
    id: 'munemori_taira_1159',
    officerIds: ['off_taira_munemori'],
    scenarioIds: ['1159'],
    setClanId: 'taira',
    setDefaultProv: 'harima',
    setAssignedProv: 'harima',
    setDaimyo: false
  },
  {
    id: 'yoshiyasu_yoshitomo_1156',
    officerIds: ['off_ashikaga_yoshiyasu'],
    scenarioIds: ['1156'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'shimotsuke',
    setAssignedProv: 'shimotsuke',
    setDaimyo: false
  },
  {
    id: 'yoshihira_yoshitomo_1156',
    officerIds: ['off_minamoto_yoshihira'],
    scenarioIds: ['1156'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },
  {
    id: 'masakiyo_yoshitomo_1156',
    officerIds: ['off_kamata_masakiyo'],
    scenarioIds: ['1156'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },

  // 1159 平治の乱（源義朝軍）
  {
    id: 'nobuyori_yamashiro_1159',
    officerIds: ['off_fujiwara_nobuyori'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'yamashiro',
    setAssignedProv: 'yamashiro',
    setDaimyo: false
  },
  {
    id: 'yoshihira_sagami_1159',
    officerIds: ['off_minamoto_yoshihira'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },
  {
    id: 'tomonaga_shimotsuke_1159',
    officerIds: ['off_minamoto_tomonaga'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'shimotsuke',
    setAssignedProv: 'shimotsuke',
    setDaimyo: false
  },
  {
    id: 'yoritomo_yoshitomo_1159',
    officerIds: ['off_minamoto_yoritomo'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },
  {
    id: 'masakiyo_yoshitomo_1159',
    officerIds: ['off_kamata_masakiyo'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'yamashiro',
    setAssignedProv: 'yamashiro',
    setDaimyo: false
  },
  {
    id: 'minamoto_yoshitaka_1159',
    officerIds: ['off_minamoto_yoshitaka'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'south_shinano',
    setAssignedProv: 'south_shinano',
    setDaimyo: false
  },
  // 1400 相馬胤弘（磐城大名・小高城主）
  {
    id: 'soma_tanehiro_iwaki_1400',
    officerIds: ['off_dm_soma_1400'],
    scenarioIds: ['1400'],
    setClanId: 'soma',
    setDefaultProv: 'iwaki',
    setAssignedProv: 'iwaki',
    setDaimyo: true
  },
  // 1400 相馬憲胤（磐城・相馬一門長老）
  {
    id: 'soma_noritane_iwaki_1400',
    officerIds: ['off_soma_noritane'],
    scenarioIds: ['1400'],
    setClanId: 'soma',
    setDefaultProv: 'iwaki',
    setAssignedProv: 'iwaki',
    setDaimyo: false
  },
  // 1400 岡田胤久（磐城・相馬筆頭重臣）
  {
    id: 'okada_tanehisa_iwaki_1400',
    officerIds: ['off_okada_tanehisa'],
    scenarioIds: ['1400'],
    setClanId: 'soma',
    setDefaultProv: 'iwaki',
    setAssignedProv: 'iwaki',
    setDaimyo: false
  },
  // 1400 相馬重胤（磐城・相馬家臣・嫡男）
  {
    id: 'soma_shigetane_iwaki_1400',
    officerIds: ['off_dm_soma_1438'],
    scenarioIds: ['1400'],
    setClanId: 'soma',
    setDefaultProv: 'iwaki',
    setAssignedProv: 'iwaki',
    setDaimyo: false
  },

  // 1400 最上直家（羽前領主・伊達氏配下）
  {
    id: 'mogami_naoie_uzen_1400',
    officerIds: ['off_jd_383'],
    scenarioIds: ['1400'],
    setClanId: 'date',
    setDefaultProv: 'uzen',
    setAssignedProv: 'uzen',
    setDaimyo: false
  },

  // 1156 源為朝（崇徳上皇軍・白河殿防衛筆頭）
  {
    id: 'tametomo_sutoku_1156',
    officerIds: ['off_minamoto_tametomo'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: false
  },
  // 1156 平忠正（崇徳上皇軍・平氏宿老）
  {
    id: 'tadamasa_sutoku_1156',
    officerIds: ['off_taira_tadamasa'],
    scenarioIds: ['1156'],
    setClanId: 'sutoku_in',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: false
  },
  // 1156 鎌田政清（源義朝軍側近）
  {
    id: 'masakiyo_yoshitomo_1156',
    officerIds: ['off_kamata_masakiyo'],
    scenarioIds: ['1156'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },
  // 1159 藤原信頼（源義朝軍・山城京都占拠首謀者）
  {
    id: 'nobuyori_yamashiro_1159',
    officerIds: ['off_fujiwara_nobuyori'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'yamashiro',
    setAssignedProv: 'yamashiro',
    setDaimyo: false
  },
  // 1159 源頼朝（源義朝軍・13歳初陣右兵衛佐）
  {
    id: 'yoritomo_yoshitomo_1159',
    officerIds: ['off_minamoto_yoritomo'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },
  // 1159 鎌田政清（源義朝軍側近）
  {
    id: 'masakiyo_yoshitomo_1159',
    officerIds: ['off_kamata_masakiyo'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },
  // 1184 源義経（一ノ谷の戦い最前線・丹波搦手軍司令官）
  {
    id: 'yoshitsune_ichinotani_1184',
    officerIds: ['off_minamoto_yoshitsune'],
    scenarioIds: ['1184'],
    setClanId: 'genji_yoritomo',
    setDefaultProv: 'tamba',
    setAssignedProv: 'tamba',
    setDaimyo: false
  },
  // 1184 武蔵坊弁慶（一ノ谷の戦い最前線・義経配下）
  {
    id: 'benkei_ichinotani_1184',
    officerIds: ['off_musashibo_benkei'],
    scenarioIds: ['1184'],
    setClanId: 'genji_yoritomo',
    setDefaultProv: 'tamba',
    setAssignedProv: 'tamba',
    setDaimyo: false
  },

  // 1159 源義隆（南信濃・源義朝軍配下）
  {
    id: 'minamoto_yoshitaka_1159',
    officerIds: ['off_minamoto_yoshitaka'],
    scenarioIds: ['1159'],
    setClanId: 'minamoto_yoshitomo',
    setDefaultProv: 'south_shinano',
    setAssignedProv: 'south_shinano',
    setDaimyo: false
  },

  // 1495 足利成氏（下総大名）、足利政氏（下総配下）
  {
    id: 'shigeuji_shimousa_1495',
    officerIds: ['off_ashikaga_shigeuji'],
    scenarioIds: ['1495', '1493'],
    setClanId: 'kamakura_fu',
    setDefaultProv: 'shimousa',
    setAssignedProv: 'shimousa',
    setDaimyo: true
  },
  {
    id: 'masauji_shimousa_1495',
    officerIds: ['off_ashikaga_masauji'],
    scenarioIds: ['1495', '1493'],
    setClanId: 'kamakura_fu',
    setDefaultProv: 'shimousa',
    setAssignedProv: 'shimousa',
    setDaimyo: false
  },
  // 1495 長尾能景（越後大名）
  {
    id: 'nagao_yoshikage_echigo_1495',
    officerIds: ['off_nagao_yoshikage'],
    scenarioIds: ['1495', '1493'],
    setClanId: 'nagao',
    setDefaultProv: 'echigo',
    setAssignedProv: 'echigo',
    setDaimyo: true
  },
  // 1495 上杉顕定（上野大名）
  {
    id: 'uesugi_akisada_kozuke_1495',
    officerIds: ['off_dm_uesugi_1495'],
    scenarioIds: ['1495', '1493'],
    setClanId: 'uesugi',
    setDefaultProv: 'kozuke',
    setAssignedProv: 'kozuke',
    setDaimyo: true
  },
  // 1495 武田元信（若狭大名）
  {
    id: 'takeda_motonobu_wakasa_1495',
    officerIds: ['off_jd_008'],
    scenarioIds: ['1495', '1493'],
    setClanId: 'takeda_wakasa',
    setDefaultProv: 'wakasa',
    setAssignedProv: 'wakasa',
    setDaimyo: true
  },
  // 1495 里見義通（安房大名）
  {
    id: 'satomi_yoshimichi_awa_1495',
    officerIds: ['off_succ_satomi_1445_153'],
    scenarioIds: ['1495', '1493'],
    setClanId: 'satomi',
    setDefaultProv: 'awa_boshu',
    setAssignedProv: 'awa_boshu',
    setDaimyo: true
  },
  // 1495 土岐政房（美濃大名）、斎藤妙純（土岐配下）
  {
    id: 'toki_masafusa_mino_1495',
    officerIds: ['off_toki_masafusa'],
    scenarioIds: ['1495', '1493'],
    setClanId: 'toki',
    setDefaultProv: 'mino',
    setAssignedProv: 'mino',
    setDaimyo: true
  },
  {
    id: 'saito_myojun_toki_service_1495',
    officerIds: ['off_dm_saito_1495'],
    scenarioIds: ['1495', '1493'],
    setClanId: 'toki',
    setDefaultProv: 'mino',
    setAssignedProv: 'mino',
    setDaimyo: false
  },
  // 1495 京極高清（北近江）
  {
    id: 'kyogoku_takakiyo_north_omi_1495',
    officerIds: ['off_succ_kyogoku_1480_80'],
    scenarioIds: ['1495', '1493'],
    setClanId: 'kyogoku',
    setDefaultProv: 'north_omi',
    setAssignedProv: 'north_omi',
    setDaimyo: false
  },

  // 1585-1598 宇喜多秀家および宇喜多家臣（備前）は豊臣配下
  {
    id: 'ukita_bizen_toyotomi_service',
    officerIds: [
      'off_dm_ukita_1582',
      'off_akashi_teruzumi',
      'off_jd_371',
      'off_jd_031',
      'off_jd_419',
      'off_jd_056',
      'off_jd_030',
      'off_uragami_narimune',
      'off_uragami_muneyasu'
    ],
    setClanId: 'toyotomi',
    scenarioIds: ['1587', '1590'],
    fromYear: 1585,
    toYear: 1598,
    requireOwners: ['toyotomi'],
    unlessOwner: 'ukita',
    setDefaultProv: 'bizen',
    setDaimyo: false
  },
  // 1587-1598 島左近は石田三成に仕官して北近江に配備
  {
    id: 'sakon_north_omi_toyotomi_service',
    officerIds: ['off_shima_sakon'],
    scenarioIds: ['1587', '1590'],
    fromYear: 1585,
    toYear: 1599,
    setClanId: 'toyotomi',
    setDefaultProv: 'north_omi',
    setAssignedProv: 'north_omi',
    requireOwners: ['toyotomi'],
    setDaimyo: false
  },
  // 1587 水野勝成は駿河の徳川配下
  {
    id: 'mizuno_katsunari_suruga_1587',
    officerIds: ['off_mizuno_katsunari'],
    scenarioIds: ['1587'],
    fromYear: 1585,
    toYear: 1590,
    setClanId: 'tokugawa',
    setDefaultProv: 'suruga',
    setAssignedProv: 'suruga',
    requireOwners: ['tokugawa'],
    setDaimyo: false
  },
  // 1180 樋口兼光・根井行親は義仲配下として南信濃
  {
    id: 'kiso_retainers_south_shinano_1180',
    officerIds: ['off_jd_208', 'off_nenoi_yukichika', 'off_imai_kanehira'],
    scenarioIds: ['1180'],
    fromYear: 1180,
    toYear: 1184,
    setClanId: 'kiso',
    setDefaultProv: 'south_shinano',
    setAssignedProv: 'south_shinano',
    requireOwners: ['kiso'],
    setDaimyo: false
  },

  {
    id: 'sakon_north_omi_1587',
    officerIds: ['off_shima_sakon'],
    scenarioIds: ['1587'],
    setClanId: 'toyotomi',
    fromYear: 1587,
    toYear: 1587,
    setDaimyo: false,
    setDefaultProv: 'north_omi',
    setAssignedProv: 'north_omi',
  },
  {
    id: 'mizuno_katsunari_suruga_1587',
    officerIds: ['off_mizuno_katsunari'],
    scenarioIds: ['1587'],
    setClanId: 'tokugawa',
    fromYear: 1587,
    toYear: 1587,
    setDaimyo: false,
    setDefaultProv: 'suruga',
    setAssignedProv: 'suruga',
  },
  {
    id: 'ukita_retainers_toyotomi_1587_1590',
    officerIds: ['off_dm_ukita_1582', 'off_jd_031', 'off_jd_419', 'off_jd_056', 'off_jd_371', 'off_jd_030', 'off_akashi_teruzumi', 'off_uragami_muneyasu', 'off_uragami_narimune'],
    scenarioIds: ['1587', '1590'],
    setClanId: 'toyotomi',
    fromYear: 1587,
    toYear: 1590,
    setDaimyo: false,
    setDefaultProv: 'bizen',
    setAssignedProv: 'bizen',
  },
  {
    id: 'chiba_yoritane_1274',
    officerIds: ['off_chiba_yoritane'],
    scenarioIds: ['1274'],
    setClanId: 'chiba',
    fromYear: 1274,
    toYear: 1274,
    setDaimyo: true,
    setDefaultProv: 'shimousa',
    setAssignedProv: 'shimousa',
  },
  {
    id: 'ashikaga_ietoki_1274',
    officerIds: ['off_ashikaga_ietoki'],
    scenarioIds: ['1274'],
    setClanId: 'ashikaga',
    fromYear: 1274,
    toYear: 1274,
    setDaimyo: true,
    setDefaultProv: 'shimotsuke',
    setAssignedProv: 'shimotsuke',
  },
  {
    id: 'satake_yoshishige_1274',
    officerIds: ['off_satake_yoshishige_kama', 'off_succ_satake_1255_140'],
    scenarioIds: ['1274'],
    setClanId: 'satake',
    fromYear: 1274,
    toYear: 1274,
    setDaimyo: true,
    setDefaultProv: 'hitachi',
    setAssignedProv: 'hitachi',
  },
  {
    id: 'takeda_nobutoki_1274',
    officerIds: ['off_succ_takeda_1240_188'],
    scenarioIds: ['1274'],
    setClanId: 'takeda',
    fromYear: 1274,
    toYear: 1274,
    setDaimyo: true,
    setDefaultProv: 'kai',
    setAssignedProv: 'kai',
  },
  {
    id: 'ogasawara_nagamasa_1274',
    officerIds: ['off_ogasawara_nagamasa_kama'],
    scenarioIds: ['1274'],
    setClanId: 'ogasawara',
    fromYear: 1274,
    toYear: 1274,
    setDaimyo: true,
    setDefaultProv: 'south_shinano',
    setAssignedProv: 'south_shinano',
  },
  {
    id: 'kono_michiari_1274',
    officerIds: ['off_kono_michiari'],
    scenarioIds: ['1274'],
    setClanId: 'kono',
    fromYear: 1274,
    toYear: 1274,
    setDaimyo: true,
    setDefaultProv: 'iyo',
    setAssignedProv: 'iyo',
  },
  {
    id: 'matsura_tota_1274',
    officerIds: ['off_matsura_tota'],
    scenarioIds: ['1274'],
    setClanId: 'matsura',
    fromYear: 1274,
    toYear: 1274,
    setDaimyo: true,
    setDefaultProv: 'hizen',
    setAssignedProv: 'hizen',
  },
  {
    id: 'date_munetsuna_1274',
    officerIds: ['off_date_munetsuna'],
    scenarioIds: ['1274'],
    setClanId: 'date',
    fromYear: 1274,
    toYear: 1274,
    setDaimyo: false,
    setDefaultProv: 'rikuzen',
    setAssignedProv: 'rikuzen',
  },
  {
    id: 'hindu_yuan_1274',
    officerIds: ['off_hindu_yuan'],
    scenarioIds: ['1274'],
    setClanId: 'yuan',
    fromYear: 1274,
    toYear: 1274,
    setDaimyo: false,
    setDefaultProv: 'tsushima',
    setAssignedProv: 'tsushima',
  },
  {
    id: 'yoshitsune_benkei_rikuchu_1189',
    officerIds: ['off_minamoto_yoshitsune', 'off_musashibo_benkei', 'off_sato_tadanobu', 'off_sato_tsugunobu'],
    scenarioIds: ['1189'],
    setClanId: 'fujiwara_hiraizumi',
    fromYear: 1189,
    toYear: 1189,
    setDaimyo: false,
    setDefaultProv: 'rikuchu',
    setAssignedProv: 'rikuchu',
  },
  {
    id: 'yoshitsune_aki_daimyo_1185',
    officerIds: ['off_minamoto_yoshitsune'],
    scenarioIds: ['1185'],
    setClanId: 'genji_yoshitsune',
    fromYear: 1185,
    toYear: 1185,
    setDaimyo: true,
    setDefaultProv: 'aki',
    setAssignedProv: 'aki',
  },
  {
    id: 'ezo_leader_aterui_801',
    officerIds: ['off_ezo_leader_801'],
    scenarioIds: ['801'],
    setClanId: 'aterui',
    fromYear: 801,
    toYear: 801,
    setDaimyo: false,
    setDefaultProv: 'ezo',
    setAssignedProv: 'ezo',
  },
  {
    id: 'yoshiaki_ronin_bingo_full',
    officerIds: ['off_ashikaga_yoshiaki'],
    setClanId: 'ronin',
    fromYear: 1573,
    toYear: 1597,
    unlessOwner: 'ashikaga',
    setDaimyo: false,
    setDefaultProv: 'bingo',
    setAssignedProv: 'bingo',
  },

  {
    id: 'muneshige_otomo_bungo_1584',
    officerIds: ['off_tachibana_muneshige'],
    scenarioIds: ['1584'],
    setClanId: 'otomo',
    fromYear: 1584,
    toYear: 1584,
    requireOwners: ['otomo'],
    unlessOwner: 'tachibana',
    setDaimyo: false,
    setDefaultProv: 'bungo',
    setAssignedProv: 'bungo',
  },

  {
    id: 'yoshimune_otomo_bungo_1590',
    officerIds: ['off_dm_otomo_1600'],
    setClanId: 'otomo',
    setDaimyo: true,
    setDefaultProv: 'bungo',
    fromYear: 1587,
    toYear: 1593,
    requireOwners: ['otomo'],
  },
  {
    id: 'asano_yukinaga_kai_1600',
    officerIds: ['off_dm_asano_1600'],
    setClanId: 'asano',
    setDaimyo: true,
    setDefaultProv: 'kai',
    fromYear: 1593,
    toYear: 1600,
    requireOwners: ['asano'],
  },
  {
    id: 'asano_nagaakira_under_yukinaga',
    officerIds: ['off_asano_nagaakira'],
    setClanId: 'asano',
    setDaimyo: false,
    setDefaultProv: 'kai',
    fromYear: 1598,
    toYear: 1612,
    requireOwners: ['asano'],
  },
  {
    id: 'mashita_nagamori_yamato_1600',
    officerIds: ['off_mashita_nagamori'],
    setClanId: 'toyotomi',
    setDaimyo: false,
    setDefaultProv: 'yamato',
    fromYear: 1595,
    toYear: 1600,
    requireOwners: ['toyotomi'],
  },
  

  {
    "id": "osaka_ronin_1614",
    "officerIds": [
      "off_sanada_yukimura",
      "off_goto_matabei",
      "off_chosokabe_morichika",
      "off_mori_katsunaga",
      "off_kimura_shigenari",
      "off_akashi_teruzumi",
      "off_susukida_kanetsugu",
      "off_ono_harunaga",
      "off_yododono"
    ],
    "setClanId": "toyotomi",
    "years": [
      1614
    ],
    "scenarioIds": [
      "1614"
    ],
    "requireOwners": [
      "toyotomi"
    ]
  },
  {
    "id": "musashi_ronin_1614",
    "officerIds": [
      "off_miyamoto_musashi"
    ],
    "setClanId": "ronin",
    "years": [
      1614
    ],
    "scenarioIds": [
      "1614"
    ],
    "clearAssignment": true
  },
  {
    "id": "oshu_fujiwara_kin",
    "officerIds": [
      "off_fujiwara_hidehira",
      "off_fujiwara_motohira",
      "off_fujiwara_motonari_1156",
      "off_fujiwara_hiderae",
      "off_fujiwara_yasuhira",
      "off_fujiwara_kunihiro",
      "off_fujiwara_tadahira_ou",
      "off_hizume_kiyohira",
      "off_sato_motoharu",
      "off_terui_takaharu",
      "off_sato_tsugunobu",
      "off_sato_tadanobu"
    ],
    "setClanId": "fujiwara_hiraizumi",
    "requireOwners": [
      "fujiwara_hiraizumi"
    ]
  },
  {
    "id": "chosokabe_chie_join",
    "officerIds": [
      "off_dm_chosokabe_1336"
    ],
    "setClanId": "chosokabe",
    "requireOwners": [
      "chosokabe"
    ]
  },
  {
    "id": "tameyoshi_1156",
    "officerIds": [
      "off_minamoto_tameyoshi"
    ],
    "setClanId": "sutoku_in",
    "years": [
      1156
    ],
    "scenarioIds": [
      "1156"
    ],
    "requireOwners": [
      "sutoku_in"
    ]
  },
  {
    "id": "kiyomitsu_1156",
    "officerIds": [
      "off_minamoto_kiyomitsu"
    ],
    "setClanId": "takeda",
    "years": [
      1156
    ],
    "scenarioIds": [
      "1156"
    ],
    "requireOwners": [
      "takeda"
    ]
  },
  {
    "id": "sadatsuna_1180",
    "officerIds": [
      "off_sasaki_sadatsuna"
    ],
    "setClanId": "genji_yoritomo",
    "years": [
      1180
    ],
    "scenarioIds": [
      "1180"
    ],
    "requireOwners": [
      "genji_yoritomo"
    ]
  },
  {
    "id": "nenoi_1180",
    "officerIds": [
      "off_nenoi_yukichika"
    ],
    "setClanId": "kiso",
    "years": [
      1180
    ],
    "scenarioIds": [
      "1180"
    ],
    "requireOwners": [
      "kiso"
    ]
  },
  {
    "id": "oba_1180",
    "officerIds": [
      "off_oba_kagechika"
    ],
    "setClanId": "taira",
    "years": [
      1180
    ],
    "scenarioIds": [
      "1180"
    ],
    "requireOwners": [
      "taira"
    ]
  },
  {
    "id": "baba_1560",
    "officerIds": [
      "off_baba_nobuharu"
    ],
    "setClanId": "takeda",
    "years": [
      1560
    ],
    "scenarioIds": [
      "1560"
    ],
    "requireOwners": [
      "takeda"
    ]
  },
  {
    "id": "satsuma_retainers_pre_meiji",
    "officerIds": [
      "off_saigo_takamori",
      "off_okubo_toshimichi",
      "off_komatsu_tatewaki",
      "off_kuroda_kiyotaka",
      "off_kirino_toshiaki",
      "off_oyama_iwao",
      "off_ijichi_masaharu"
    ],
    "setClanId": "shimazu",
    "requireOwners": [
      "shimazu"
    ],
    "unlessOwner": "meiji"
  },
  {
    "id": "choshu_retainers_pre_meiji",
    "officerIds": [
      "off_kido_takayoshi",
      "off_takasugi_shinsaku",
      "off_omura_masujiro",
      "off_ito_hirobumi",
      "off_inoue_kaoru",
      "off_yamada_akiyoshi",
      "off_yamagata_aritomo",
      "off_shinagawa_yajiro",
      "off_sera_shuzo"
    ],
    "setClanId": "mori",
    "requireOwners": [
      "mori"
    ],
    "unlessOwner": "meiji"
  },
  {
    "id": "tosa_retainers_pre_meiji",
    "officerIds": [
      "off_sakamoto_ryoma",
      "off_nakaoka_shintaro",
      "off_itagaki_taisuke",
      "off_goto_shojiro"
    ],
    "setClanId": "tosa",
    "requireOwners": [
      "tosa"
    ],
    "unlessOwner": "meiji"
  },
  {
    "id": "auto_1582_oda_odaRetainers_1",
    "officerIds": [
      "off_toyotomi_hideyoshi",
      "off_toyotomi_hidenaga",
      "off_toyotomi_hidetsugu",
      "off_akechi_mitsuhide",
      "off_jd_018",
      "off_shibata_katsuie",
      "off_sakuma_morimasa",
      "off_maeda_toshiie",
      "off_sassa_narimasa",
      "off_niwa_nagahide",
      "off_takigawa_kazumasu",
      "off_mori_nagayoshi",
      "off_gamo_ujisato",
      "off_ikeda_tsuneoki",
      "off_ikeda_terumasa",
      "off_hosokawa_fujitaka",
      "off_hosokawa_tadaoki",
      "off_tsutsui_junkei",
      "off_oda_nobutada",
      "off_oda_nobukatsu",
      "off_oda_nobutaka",
      "off_kuroda_kanbei",
      "off_hachisuka_koroku",
      "off_hachisuka_iemasa",
      "off_ishida_mitsunari",
      "off_otani_yoshitsugu",
      "off_fukushima_masanori",
      "off_kato_kiyomasa",
      "off_asano_nagamasa",
      "off_yamauchi_kazutoyo",
      "off_hori_hidemasa",
      "off_konishi_yukinaga",
      "off_cho_tsuratatsu"
    ],
    "setClanId": "oda",
    "years": [
      1582
    ],
    "scenarioIds": [
      "1582"
    ],
    "requireOwners": [
      "oda"
    ]
  },
  {
    "id": "auto_any_tokugawa_tokuRetainers_2",
    "officerIds": [
      "off_tokugawa_ieyasu",
      "off_honda_tadakatsu",
      "off_sakai_tadatsugu",
      "off_sakakibara_yasumasa",
      "off_ii_naomasa",
      "off_ishikawa_kazumasa",
      "off_okubo_tadayo",
      "off_torii_mototada"
    ],
    "setClanId": "tokugawa",
    "requireOwners": [
      "tokugawa"
    ]
  },
  {
    "id": "auto_1584_toyotomi_toyoRetainers_3",
    "officerIds": [
      "off_toyotomi_hideyoshi",
      "off_toyotomi_hidenaga",
      "off_toyotomi_hidetsugu",
      "off_ikeda_tsuneoki",
      "off_ikeda_terumasa",
      "off_mori_nagayoshi",
      "off_hori_hidemasa",
      "off_maeda_toshiie",
      "off_asano_nagamasa",
      "off_ishida_mitsunari",
      "off_otani_yoshitsugu",
      "off_gamo_ujisato",
      "off_niwa_nagahide",
      "off_hachisuka_koroku",
      "off_hachisuka_iemasa",
      "off_kato_kiyomasa",
      "off_fukushima_masanori",
      "off_konishi_yukinaga",
      "off_hosokawa_fujitaka",
      "off_hosokawa_tadaoki",
      "off_cho_tsuratatsu",
      "off_maeda_geni",
      "off_yamana_toyokuni",
      "off_kanamori_arishige",
      "off_wakisaka_yasuharu",
      "off_succ_ito_1550_45",
      "off_koide_yoshimasa"
    ],
    "setClanId": "toyotomi",
    "years": [
      1584
    ],
    "scenarioIds": [
      "1584"
    ],
    "requireOwners": [
      "toyotomi"
    ]
  },
  {
    "id": "auto_1584_tokugawa_tokuRetainers_4",
    "officerIds": [
      "off_tokugawa_ieyasu",
      "off_sakai_tadatsugu",
      "off_honda_tadakatsu",
      "off_sakakibara_yasumasa",
      "off_ii_naomasa",
      "off_torii_mototada",
      "off_okubo_tadayo",
      "off_kiso_yoshimasa",
      "off_succ_ogasawara_1545_115",
      "off_ishikawa_kazumasa",
      "off_okubo_tadachika",
      "off_suwa_yoritada",
      "off_kimata_morikatsu"
    ],
    "setClanId": "tokugawa",
    "years": [
      1584
    ],
    "scenarioIds": [
      "1584"
    ],
    "requireOwners": [
      "tokugawa"
    ]
  },
  {
    "id": "auto_any_hojo_hojoRetainers_5",
    "officerIds": [
      "off_hojo_ujikuni",
      "off_hojo_ujinori",
      "off_chiba_kunitane",
      "off_narita_ujinaga",
      "off_narita_nagachika"
    ],
    "setClanId": "hojo",
    "requireOwners": [
      "hojo"
    ],
    "setDaimyo": false
  },
  {
    "id": "auto_any_oda_odaRetainers_6",
    "officerIds": [
      "off_oda_nobukatsu",
      "off_jd_017",
      "off_takigawa_kazumasu",
      "off_jd_059"
    ],
    "setClanId": "oda",
    "requireOwners": [
      "oda"
    ]
  },
  {
    "id": "auto_1587_toyotomi_toyoRetainers_7",
    "officerIds": [
      "off_toyotomi_hideyoshi",
      "off_toyotomi_hidenaga",
      "off_toyotomi_hidetsugu",
      "off_kuroda_kanbei",
      "off_kuroda_nagamasa",
      "off_tachibana_muneshige",
      "off_kato_kiyomasa",
      "off_fukushima_masanori",
      "off_asano_nagamasa",
      "off_ishida_mitsunari",
      "off_otani_yoshitsugu",
      "off_gamo_ujisato",
      "off_hachisuka_iemasa",
      "off_maeda_toshiie",
      "off_hori_hidemasa",
      "off_kobayakawa_takakage",
      "off_konishi_yukinaga",
      "off_hosokawa_fujitaka",
      "off_hosokawa_tadaoki",
      "off_cho_tsuratatsu",
      "off_dm_maeda_1600",
      "off_niwa_nagashige",
      "off_maeda_geni",
      "off_yamana_toyokuni",
      "off_kanamori_arishige",
      "off_kato_yoshiaki",
      "off_sengoku_hidehisa",
      "off_succ_ito_1550_45",
      "off_wakisaka_yasuharu",
      "off_dm_ukita_1582",
      "off_akashi_teruzumi",
      "off_jd_371",
      "off_jd_031",
      "off_jd_419",
      "off_jd_056",
      "off_jd_030",
      "off_uragami_narimune",
      "off_uragami_muneyasu"
    ],
    "setClanId": "toyotomi",
    "years": [
      1587
    ],
    "scenarioIds": [
      "1587"
    ],
    "requireOwners": [
      "toyotomi"
    ]
  },
  {
    "id": "auto_1587_hojo_hojoRetainers_8",
    "officerIds": [
      "off_hojo_ujikuni",
      "off_hojo_ujinori",
      "off_chiba_kunitane",
      "off_chiba_shigetane",
      "off_narita_ujinaga",
      "off_narita_nagachika"
    ],
    "setClanId": "hojo",
    "years": [
      1587
    ],
    "scenarioIds": [
      "1587"
    ],
    "requireOwners": [
      "hojo"
    ],
    "setDaimyo": false
  },
  {
    "id": "auto_any_shimazu_shimazuRetainers_9",
    "officerIds": [
      "off_shimazu_yoshihisa",
      "off_shimazu_yoshihiro",
      "off_shimazu_iehisa",
      "off_shimazu_toshihisa",
      "off_jd_334"
    ],
    "setClanId": "shimazu",
    "requireOwners": [
      "shimazu"
    ]
  },
  {
    "id": "auto_any_otomo_otomoRetainers_10",
    "officerIds": [
      "off_otomo_sorin",
      "off_dm_otomo_1600"
    ],
    "setClanId": "otomo",
    "requireOwners": [
      "otomo"
    ]
  },
  {
    "id": "auto_any_ryuzoji_ryuzojiRetainers_11",
    "officerIds": [
      "off_nabeshima_naoshige",
      "off_ryuzoji_masaie"
    ],
    "setClanId": "ryuzoji",
    "requireOwners": [
      "ryuzoji"
    ]
  },
  {
    "id": "auto_any_tokugawa_tokuRetainers_12",
    "officerIds": [
      "off_tokugawa_ieyasu",
      "off_honda_tadakatsu",
      "off_sakai_tadatsugu",
      "off_sakakibara_yasumasa",
      "off_ii_naomasa",
      "off_torii_mototada",
      "off_okubo_tadayo"
    ],
    "setClanId": "tokugawa",
    "requireOwners": [
      "tokugawa"
    ]
  },
  {
    "id": "auto_1590_toyotomi_toyoRetainers_13",
    "officerIds": [
      "off_toyotomi_hideyoshi",
      "off_toyotomi_hidenaga",
      "off_toyotomi_hidetsugu",
      "off_maeda_toshiie",
      "off_dm_maeda_1600",
      "off_hori_hidemasa",
      "off_niwa_nagashige",
      "off_dm_ukita_1582",
      "off_kobayakawa_takakage",
      "off_konishi_yukinaga",
      "off_asano_nagamasa",
      "off_ishida_mitsunari",
      "off_otani_yoshitsugu",
      "off_gamo_ujisato",
      "off_fukushima_masanori",
      "off_hachisuka_iemasa",
      "off_hachisuka_koroku",
      "off_yamauchi_kazutoyo",
      "off_wakisaka_yasuharu",
      "off_kato_yoshiaki",
      "off_katagiri_katsumoto",
      "off_kimura_shigenari",
      "off_hosokawa_fujitaka",
      "off_hosokawa_tadaoki",
      "off_cho_tsuratatsu",
      "off_soma_yoshitane",
      "off_succ_ito_1550_45",
      "off_yamana_toyokuni",
      "off_maeda_geni",
      "off_akashi_teruzumi",
      "off_jd_371",
      "off_jd_031",
      "off_jd_419",
      "off_jd_056",
      "off_jd_030",
      "off_uragami_narimune",
      "off_uragami_muneyasu"
    ],
    "setClanId": "toyotomi",
    "years": [
      1590
    ],
    "scenarioIds": [
      "1590"
    ],
    "requireOwners": [
      "toyotomi"
    ]
  },
  {
    "id": "auto_any_hojo_hojoRetainers_14",
    "officerIds": [
      "off_dm_hojo_1582",
      "off_hojo_ujimasa",
      "off_hojo_ujiteru",
      "off_hojo_ujikuni",
      "off_hojo_ujinori",
      "off_narita_ujinaga",
      "off_narita_nagachika",
      "off_chiba_shigetane"
    ],
    "setClanId": "hojo",
    "requireOwners": [
      "hojo"
    ],
    "setDaimyo": false
  },
  {
    "id": "auto_1592_toyotomi_toyoRetainers_16",
    "officerIds": [
      "off_toyotomi_hideyoshi",
      "off_toyotomi_hidetsugu",
      "off_konishi_yukinaga",
      "off_kobayakawa_takakage",
      "off_fukushima_masanori",
      "off_asano_nagamasa",
      "off_ishida_mitsunari",
      "off_otani_yoshitsugu",
      "off_gamo_ujisato",
      "off_hachisuka_iemasa",
      "off_mashita_nagamori",
      "off_maeda_geni",
      "off_dm_otomo_1600",
      "off_hosokawa_fujitaka",
      "off_hosokawa_tadaoki",
      "off_cho_tsuratatsu",
      "off_soma_yoshitane",
      "off_succ_ito_1550_45",
      "off_yamauchi_kazutoyo",
      "off_tanaka_yoshimasa",
      "off_todo_takatora",
      "off_kyogoku_takatsugu",
      "off_koide_yoshimasa",
      "off_ikeda_terumasa",
      "off_kato_yoshiaki",
      "off_nakamura_kazuuji",
      "off_ishikawa_kazumasa",
      "off_wakisaka_yasuharu",
      "off_sengoku_hidehisa"
    ],
    "setClanId": "toyotomi",
    "years": [
      1592
    ],
    "scenarioIds": [
      "1592"
    ],
    "requireOwners": [
      "toyotomi"
    ]
  },
  {
    "id": "auto_any_tokugawa_tokuRetainers_17",
    "officerIds": [
      "off_tokugawa_ieyasu",
      "off_tokugawa_hidetada",
      "off_honda_tadakatsu",
      "off_sakakibara_yasumasa",
      "off_ii_naomasa",
      "off_torii_mototada",
      "off_okubo_tadachika",
      "off_hiraiwa_chikayoshi",
      "off_sakai_tadatsugu"
    ],
    "setClanId": "tokugawa",
    "requireOwners": [
      "tokugawa"
    ]
  },
  {
    "id": "auto_any_maeda_maedaRetainers_18",
    "officerIds": [
      "off_maeda_toshiie",
      "off_dm_maeda_1600"
    ],
    "setClanId": "maeda",
    "requireOwners": [
      "maeda"
    ]
  },
  {
    "id": "auto_1600_ishida_westRetainers_19",
    "officerIds": [
      "off_ishida_mitsunari",
      "off_otani_yoshitsugu",
      "off_shima_sakon",
      "off_kobayakawa_hideaki",
      "off_oda_hidenobu",
      "off_maeda_geni",
      "off_konishi_yukinaga"
    ],
    "setClanId": "ishida",
    "years": [
      1600
    ],
    "scenarioIds": [
      "1600"
    ],
    "requireOwners": [
      "ishida"
    ]
  },
  {
    "id": "auto_1570_oda_odaMembers_20",
    "officerIds": [
      "off_toyotomi_hideyoshi",
      "off_toyotomi_hidenaga",
      "off_asano_nagamasa",
      "off_sengoku_hidehisa",
      "off_yamauchi_kazutoyo"
    ],
    "setClanId": "oda",
    "years": [
      1570
    ],
    "scenarioIds": [
      "1570"
    ],
    "requireOwners": [
      "oda"
    ]
  },
  {
    "id": "auto_1560_oda_odaMembers_21",
    "officerIds": [
      "off_toyotomi_hideyoshi",
      "off_toyotomi_hidenaga"
    ],
    "setClanId": "oda",
    "years": [
      1560
    ],
    "scenarioIds": [
      "1560"
    ],
    "requireOwners": [
      "oda"
    ]
  },
  {
    "id": "single_1637_hosokawa_宮本武蔵_28",
    "officerIds": [
      "off_miyamoto_musashi"
    ],
    "setClanId": "hosokawa",
    "years": [
      1637
    ],
    "scenarioIds": [
      "1637"
    ],
    "requireOwners": [
      "hosokawa"
    ]
  },
  {
    "id": "single_any_tachibana_立花宗茂_29",
    "officerIds": [
      "off_tachibana_muneshige"
    ],
    "setClanId": "tachibana",
    "requireOwners": [
      "tachibana"
    ],
    "setDaimyo": true,
    "setDefaultProv": "chikugo"
  },
  {
    "id": "single_any_toyotomi_黒田官兵衛_30",
    "officerIds": [
      "off_kuroda_kanbei",
      "off_kuroda_nagamasa"
    ],
    "setClanId": "toyotomi",
    "requireOwners": [
      "toyotomi"
    ],
    "setDaimyo": false
  },
  {
    "id": "single_any_sanada_真田昌幸_31",
    "officerIds": [
      "off_sanada_masayuki",
      "off_sanada_nobuyuki",
      "off_sanada_yukimura"
    ],
    "setClanId": "sanada",
    "requireOwners": [
      "sanada"
    ]
  },
  {
    "id": "single_any_hojo_千葉邦胤_32",
    "officerIds": [
      "off_chiba_kunitane",
      "off_chiba_shigetane"
    ],
    "setClanId": "hojo",
    "requireOwners": [
      "hojo"
    ],
    "setDaimyo": false
  },
  {
    "id": "single_any_sassa_佐々成政_33",
    "officerIds": [
      "off_sassa_narimasa"
    ],
    "setClanId": "sassa",
    "requireOwners": [
      "sassa"
    ]
  },
  {
    "id": "single_any_mori_吉川広家_34",
    "officerIds": [
      "off_kikkawa_hiroie"
    ],
    "setClanId": "mori",
    "requireOwners": [
      "mori"
    ],
    "setDaimyo": false
  },
  {
    "id": "single_any_otomo_高橋紹運_35",
    "officerIds": [
      "off_takahashi_shoun",
      "off_tachibana_dosetsu"
    ],
    "setClanId": "otomo",
    "requireOwners": [
      "otomo"
    ],
    "setDaimyo": false
  },
  {
    "id": "single_any_shimazu_相良頼房_36",
    "officerIds": [
      "off_succ_sagara_1570_136"
    ],
    "setClanId": "shimazu",
    "requireOwners": [
      "shimazu"
    ],
    "setDaimyo": false
  },
  {
    "id": "single_any_tsutsui_島左近_37",
    "officerIds": [
      "off_shima_sakon",
      "off_tsutsui_junkei"
    ],
    "setClanId": "tsutsui",
    "requireOwners": [
      "tsutsui"
    ],
    "setDaimyo": false
  },
  {
    "id": "single_any_toyotomi_島左近_38",
    "officerIds": [
      "off_shima_sakon"
    ],
    "setClanId": "toyotomi",
    "requireOwners": [
      "toyotomi"
    ],
    "setDaimyo": false
  },
  {
    "id": "single_any_kuroda_黒田_40",
    "officerIds": [
      "off_kuroda_kanbei",
      "off_kuroda_tsugutaka",
      "off_kuroda_mitsuyuki",
      "off_kuroda_tsunamasa",
      "off_succ_kuroda_1754_77",
      "off_kuroda_haruyuki",
      "off_edo_kuroda_1750_209",
      "off_kuroda_kiyotaka",
      "off_edo_kuroda_1795_210",
      "off_succ_kuroda_1777_78",
      "off_succ_kuroda_1680_76",
      "off_kuroda_tadayuki",
      "off_kuroda_nagataka_fuk",
      "off_kuroda_nagashige_fuk",
      "off_kuroda_nagamasa",
      "off_kuroda_nagashige",
      "off_kuroda_nagamichi",
      "off_kuroda_nagahiro_han",
      "off_jd_082"
    ],
    "setClanId": "kuroda",
    "requireOwners": [
      "kuroda"
    ]
  },
  {
    "id": "single_any_kato_加藤清正_41",
    "officerIds": [
      "off_kato_kiyomasa"
    ],
    "setClanId": "kato",
    "requireOwners": [
      "kato"
    ]
  },
  {
    "id": "single_any_nabeshima_鍋島_42",
    "officerIds": [
      "off_nabeshima_mitsushige",
      "off_nabeshima_tsunashige",
      "off_edo_nabeshima_1745_200",
      "off_succ_nabeshima_1715_101",
      "off_nabeshima_muneshige",
      "off_nabeshima_katsushige",
      "off_edo_nabeshima_1780_201",
      "off_nabeshima_naohiro",
      "off_nabeshima_naoaki",
      "off_dm_nabeshima_1868",
      "off_nabeshima_naoyasu",
      "off_nabeshima_naoshige"
    ],
    "setClanId": "nabeshima",
    "requireOwners": [
      "nabeshima"
    ],
    "setDaimyo": false
  },
  {
    "id": "single_any_uesugi_相馬義胤_43",
    "officerIds": [
      "off_soma_yoshitane"
    ],
    "setClanId": "uesugi",
    "requireOwners": [
      "uesugi"
    ],
    "setDaimyo": false
  },
  {
    "id": "single_any_toyotomi_淀殿_44",
    "officerIds": [
      "off_yododono",
      "off_katagiri_katsumoto",
      "off_ono_harunaga"
    ],
    "setClanId": "toyotomi",
    "requireOwners": [
      "toyotomi"
    ]
  },
  {
    "id": "single_1614_nabeshima_鍋島直茂_45",
    "officerIds": [
      "off_nabeshima_naoshige",
      "off_nabeshima_katsushige"
    ],
    "setClanId": "nabeshima",
    "years": [
      1614
    ],
    "scenarioIds": [
      "1614"
    ],
    "requireOwners": [
      "nabeshima"
    ]
  },
  {
    "id": "single_1614_kuroda_黒田長政_46",
    "officerIds": [
      "off_kuroda_nagamasa"
    ],
    "setClanId": "kuroda",
    "years": [
      1614
    ],
    "scenarioIds": [
      "1614"
    ],
    "requireOwners": [
      "kuroda"
    ]
  },
  {
    "id": "single_1614_owari_織田信雄_47",
    "officerIds": [
      "off_oda_nobukatsu"
    ],
    "setClanId": "owari",
    "years": [
      1614
    ],
    "scenarioIds": [
      "1614"
    ],
    "requireOwners": [
      "owari"
    ],
    "setDaimyo": false
  },
  {
    "id": "single_any_tokugawa_丹羽長重_48",
    "officerIds": [
      "off_niwa_nagashige",
      "off_soma_yoshitane",
      "off_mogami_yoshiaki",
      "off_shakenobe_hidetsuna"
    ],
    "setClanId": "tokugawa",
    "requireOwners": [
      "tokugawa"
    ],
    "setDaimyo": false
  },
  {
    "id": "single_1570_tokugawa_家康_49",
    "officerIds": [
      "off_tokugawa_ieyasu",
      "off_honda_tadakatsu",
      "off_ii_naomasa",
      "off_sakai_tadatsugu",
      "off_sakakibara_yasumasa"
    ],
    "setClanId": "tokugawa",
    "years": [
      1570
    ],
    "scenarioIds": [
      "1570"
    ],
    "requireOwners": [
      "tokugawa"
    ]
  },
  {
    "id": "single_1560_imagawa_家康_50",
    "officerIds": [
      "off_tokugawa_ieyasu",
      "off_sakai_tadatsugu",
      "off_honda_tadakatsu",
      "off_torii_mototada",
      "off_honda_masanobu"
    ],
    "setClanId": "imagawa",
    "years": [
      1560
    ],
    "scenarioIds": [
      "1560"
    ],
    "requireOwners": [
      "imagawa"
    ],
    "setDaimyo": false
  },
  {
    "id": "single_1868_meiji_真田幸教_51",
    "officerIds": [
      "off_sanada_yukinori",
      "off_sanada_yukitaka_m",
      "off_sanada_yukitsura"
    ],
    "setClanId": "meiji",
    "years": [
      1868
    ],
    "scenarioIds": [
      "1868"
    ],
    "requireOwners": [
      "meiji"
    ],
    "setDaimyo": false
  },
  {
    "id": "single_1868_kumamoto_hosokawa_細川韶邦_52",
    "officerIds": [
      "off_hosokawa_yoshikuni",
      "off_hosokawa_morihisa",
      "off_hosokawa_narimori"
    ],
    "setClanId": "kumamoto_hosokawa",
    "years": [
      1868
    ],
    "scenarioIds": [
      "1868"
    ],
    "requireOwners": [
      "kumamoto_hosokawa"
    ]
  },
  {
    "id": "single_1868_fukuoka_kuroda_黒田長溥_53",
    "officerIds": [
      "off_kuroda_nagahiro_han",
      "off_kuroda_nagashige"
    ],
    "setClanId": "fukuoka_kuroda",
    "years": [
      1868
    ],
    "scenarioIds": [
      "1868"
    ],
    "requireOwners": [
      "fukuoka_kuroda"
    ]
  },
  {
    "id": "single_1868_ii_井伊直弼_54",
    "officerIds": [
      "off_edo_ii_1815_143",
      "off_edo_ii_1848_144",
      "off_edo_ii_1800_145"
    ],
    "setClanId": "ii",
    "years": [
      1868
    ],
    "scenarioIds": [
      "1868"
    ],
    "requireOwners": [
      "ii"
    ]
  },
  {
    "id": "single_1868_maeda_前田利同_55",
    "officerIds": [
      "off_maeda_toshitomo",
      "off_maeda_toshiyasu",
      "off_maeda_nariyasu",
      "off_dm_maeda_1868"
    ],
    "setClanId": "maeda",
    "years": [
      1868
    ],
    "scenarioIds": [
      "1868"
    ],
    "requireOwners": [
      "maeda"
    ]
  },
  {
    "id": "single_1868_nanbu_南部信順_56",
    "officerIds": [
      "off_nanbu_nobuyuki",
      "off_narayama_sado",
      "off_dm_nanbu_1868"
    ],
    "setClanId": "nanbu",
    "years": [
      1868
    ],
    "scenarioIds": [
      "1868"
    ],
    "requireOwners": [
      "nanbu"
    ],
    "setDaimyo": false
  },
  {
    "id": "single_1868_aizu_松平容保_57",
    "officerIds": [
      "off_matsudaira_katamori",
      "off_sagawa_kanbei"
    ],
    "setClanId": "aizu",
    "years": [
      1868
    ],
    "scenarioIds": [
      "1868"
    ],
    "requireOwners": [
      "aizu"
    ],
    "setDaimyo": false
  },
  {
    "id": "single_1868_shonai_榎本武揚_58",
    "officerIds": [
      "off_enomoto_takeaki",
      "off_otori_keisuke",
      "off_hijikata_toshizo",
      "off_hitomi_katsutaro",
      "off_nakajima_nobori",
      "off_kasuga_saemon",
      "off_shimada_kai"
    ],
    "setClanId": "shonai",
    "years": [
      1868
    ],
    "scenarioIds": [
      "1868"
    ],
    "requireOwners": [
      "shonai"
    ]
  },
  {
    "id": "single_1868_tokugawa_酒井吉之丞_59",
    "officerIds": [
      "off_sakai_kichinojo",
      "off_ban_hyakuetsu"
    ],
    "setClanId": "tokugawa",
    "years": [
      1868
    ],
    "scenarioIds": [
      "1868"
    ],
    "requireOwners": [
      "tokugawa"
    ],
    "setDaimyo": false
  },
  {
    "id": "single_1600_hosokawa_細川_60",
    "officerIds": [
      "off_jd_247",
      "off_dm_hosokawa_1350",
      "off_hosokawa_morihisa",
      "off_hosokawa_morinari",
      "off_hosokawa_morisada",
      "off_hosokawa_moritatsu",
      "off_hosokawa_morihiro_pm",
      "off_hosokawa_mitsunao",
      "off_hosokawa_tsunatoshi",
      "off_jd_069",
      "off_hosokawa_takakuni",
      "off_hosokawa_mochikata",
      "off_hosokawa_mochiharu",
      "off_dm_hosokawa_1438",
      "off_succ2_hosokawa_1756",
      "off_succ2_hosokawa_1715",
      "off_hosokawa_shigekata",
      "off_jd_246",
      "off_hosokawa_katsumoto",
      "off_hosokawa_sumimoto",
      "off_hosokawa_shigeharu",
      "off_hosokawa_shigeyuki",
      "off_hosokawa_masamoto",
      "off_succ_hosokawa_1450_38",
      "off_hosokawa_harumoto",
      "off_hosokawa_kiyouji",
      "off_hosokawa_narimori",
      "off_hosokawa_narinaga",
      "off_edo_hosokawa_1755_211",
      "off_hosokawa_nobunori",
      "off_hosokawa_tadaoki",
      "off_hosokawa_tadatoshi",
      "off_hosokawa_fujitaka",
      "off_hosokawa_mitsumoto",
      "off_hosokawa_yorimoto",
      "off_dm_hosokawa_1336",
      "off_jd_408",
      "off_hosokawa_yoriyuki",
      "off_succ2_hosokawa_1630",
      "off_dm_hosokawa_1331",
      "off_hosokawa_yoshikuni"
    ],
    "setClanId": "hosokawa",
    "years": [
      1600
    ],
    "scenarioIds": [
      "1600"
    ],
    "requireOwners": [
      "hosokawa"
    ]
  },
  {
    "id": "single_1600_okayama_池田_61",
    "officerIds": [
      "off_ikeda_terumasa",
      "off_edo_tottori_1689_151",
      "off_edo_tottori_1824_158",
      "off_edo_okayama_1823_205",
      "off_dm_tottori_1868",
      "off_ikeda_tsugumasa",
      "off_ikeda_mitsumasa",
      "off_edo_tottori_1630_149",
      "off_ikeda_tsuneoki",
      "off_ikeda_tsunamasa",
      "off_edo_tottori_1648_150",
      "off_succ_okayama_1768_120",
      "off_edo_tottori_1768_154",
      "off_edo_tottori_1716_152",
      "off_edo_tottori_1745_153",
      "off_ikeda_akimasa",
      "off_ikeda_masakoto",
      "off_jd_296",
      "off_edo_tottori_1812_157",
      "off_edo_okayama_1773_203",
      "off_edo_okayama_1811_204",
      "off_edo_tottori_1788_155",
      "off_edo_tottori_1802_156",
      "off_ikeda_nobumasa_okayama",
      "off_ikeda_akima",
      "off_ikeda_nakahiro",
      "off_ikeda_tadatsugu",
      "off_ikeda_tadao",
      "off_ikeda_sadamasa",
      "off_ikeda_tokuzane",
      "off_ikeda_yuriko",
      "off_dm_okayama_1868",
      "off_succ_okayama_1584_117"
    ],
    "setClanId": "okayama",
    "years": [
      1600
    ],
    "scenarioIds": [
      "1600"
    ],
    "requireOwners": [
      "okayama"
    ],
    "setDaimyo": false
  },
  {
    "id": "single_any_ishida_島左近_62",
    "officerIds": [
      "off_shima_sakon",
      "off_shimotsuma_rairen"
    ],
    "setClanId": "ishida",
    "requireOwners": [
      "ishida"
    ],
    "setDaimyo": false
  },
  {
    "id": "single_any_nabeshima_龍造寺政家_63",
    "officerIds": [
      "off_ryuzoji_masaie",
      "off_goto_ienobu_ryu"
    ],
    "setClanId": "nabeshima",
    "requireOwners": [
      "nabeshima"
    ],
    "setDaimyo": false
  }
];;
if (typeof window !== "undefined") window.OFFICER_AFFILIATION_RULES = OFFICER_AFFILIATION_RULES;

export const OFFICER_FAMILY_ROSTERS = {
  "chosokabe": [
    "off_jd_021",
    "off_jd_022",
    "off_chosokabe_ketsugu",
    "off_chosokabe_motochika",
    "off_dm_chosokabe_1546",
    "off_chosokabe_shigeuji",
    "off_chosokabe_nobukane",
    "off_dm_chosokabe_1336",
    "off_chosokabe_moritsune",
    "off_chosokabe_moritaka",
    "off_chosokabe_morichika",
    "off_chosokabe_yoshitoshi",
    "off_chosokabe_fumikane",
    "off_jd_023"
  ],
  "nanbu": [
    "off_kunohe_sanechika",
    "off_kunohe_masazane",
    "off_jd_013",
    "off_jd_326",
    "off_dm_nanbu_1221",
    "off_dm_nanbu_1467",
    "off_nanbu_yukinobu",
    "off_succ2_nanbu_1495",
    "off_dm_nanbu_1331",
    "off_dm_nanbu_1495",
    "off_nanbu_tokinaga",
    "off_jd_318",
    "off_nanbu_sanenaga_1221",
    "off_dm_nanbu_1438",
    "off_nanbu_shigenao",
    "off_succ2_nanbu_1675",
    "off_nanbu_nobuyuki",
    "off_jd_241",
    "off_nanbu_nobunaga",
    "off_dm_nanbu_1582",
    "off_nanbu_masamitsu",
    "off_jd_303",
    "off_succ2_nanbu_1285",
    "off_jd_370",
    "off_succ2_nanbu_1345",
    "off_nanbu_masanaga",
    "off_nanbu_harumasa",
    "off_nanbu_toshihide",
    "off_nanbu_toshimoto",
    "off_nanbu_toshiyuki",
    "off_succ2_nanbu_1755",
    "off_edo_nanbu_1782_186",
    "off_dm_nanbu_1868",
    "off_edo_nanbu_1797_187",
    "off_nanbu_toshiatsu",
    "off_nanbu_toshiaki",
    "off_succ_nanbu_1751_107",
    "off_nanbu_toshinao",
    "off_nanbu_toshifumi",
    "off_nanbu_toshio",
    "off_jd_340",
    "off_hachinohe_naoyoshi",
    "off_edo_nanbu_1600_188",
    "off_edo_nanbu_1805_189",
    "off_jd_431",
    "off_kita_nobuchika",
    "off_nanbu_namioka_akiyasu"
  ]
};;
if (typeof window !== "undefined") window.OFFICER_FAMILY_ROSTERS = OFFICER_FAMILY_ROSTERS;

export const HISTORICAL_EVENT_LINKS = [
      { choiceId: 'fujiwara_kiyohira_restoration', dataIds: ['evt_1088_kiyohira_fujiwara'], year: 1088, season: '春' },
      { choiceId: 'minatogawa', dataIds: ['evt_1336_minatogawa'], year: 1336, season: '夏' },
      { choiceId: 'kawagoe', dataIds: ['evt_1546_kawagoe_night'], year: 1546, season: '春' },
      { choiceId: 'okehazama', dataIds: ['evt_1560_okehazama'], year: 1560, season: '夏' },
      { choiceId: 'sanpougahara', dataIds: ['evt_1572_mikatagahara'], year: 1572, season: '冬' },
      { choiceId: 'honnoji', dataIds: ['evt_1582_honnouji_yamazaki'], year: 1582, season: '夏' },
      { choiceId: 'kunohe_rebellion', dataIds: ['evt_1591_kunohe_rebellion'], year: 1591, season: '夏' },
      { choiceId: 'sekigahara', dataIds: ['evt_1600_sekigahara'], year: 1600, season: '秋' },
      { choiceId: 'shimabara_rebellion', dataIds: ['evt_1637_shimabara_outbreak'], year: 1637, season: '冬' },
      { choiceId: 'keian_yui_rebellion', dataIds: ['evt_1651_keian_hen'], year: 1651, season: '秋' },
      { choiceId: 'tenguto_rebellion', dataIds: ['evt_1864_tenguto_rebellion'], year: 1864, season: '冬' },
      { choiceId: 'tobafushimi', dataIds: ['evt_1868_toba_fushimi'], year: 1868, season: '春' }
    ];;
if (typeof window !== "undefined") window.HISTORICAL_EVENT_LINKS = HISTORICAL_EVENT_LINKS;

export const REBELLION_EVENT_PAIRS = [
      ['evt_1591_kunohe_rebellion', 'kunohe_rebellion', 'evt_1591_kunohe_victory_if'],
      ['evt_1651_keian_hen', 'keian_yui_rebellion', 'evt_1651_keian_success_if'],
      ['evt_1864_tenguto_rebellion', 'tenguto_rebellion', 'evt_1864_tenguto_success_if']
    ];

// ============================================================================
// 歴史イベント・エンジン用マスターデータ（app.js はこれを読んで汎用に処理する）
// ============================================================================

// イベントIDごとの特殊扱い。app.js 側にイベントIDを直書きしない;
if (typeof window !== "undefined") window.REBELLION_EVENT_PAIRS = REBELLION_EVENT_PAIRS;

export const HISTORICAL_EVENT_RULES = {
  // 領地がすでに史実どおりでも「変化なし」で済ませない（改名・落命・相続などの付帯処理がある）
  neverNoop: [
    'evt_1088_kiyohira_fujiwara', 'evt_1560_okehazama', 'evt_1087_kanazawa', 'evt_1582_yamazaki',
    'evt_1582_honnouji_yamazaki', 'evt_1837_oshio_success_if', 'evt_1837_ikuta_success_if',
    'evt_1863_tenchugumi_success_if', 'evt_1863_ikuno_success_if'
  ],
  // ゲーム内フラグが立っていたら起こさない（本能寺回避後の山崎・賤ヶ岳など）
  skipWhenFlag: {
    honnoujiAverted: ['evt_1582_yamazaki', 'evt_1583_shizugatake']
  },
  // 前提欠如で封じたときに立てるフラグ
  setFlagOnPrereqSkip: { 'evt_1582_honnouji_yamazaki': 'honnoujiAverted' },
  // データイベントで「史実を適用しない」を選んだときに立てるフラグ
  setFlagOnReject: { 'evt_1582_honnouji_yamazaki': 'honnoujiAverted' },
  // 選択イベントで改変ルートを選んだときに立てるフラグ
  setFlagOnIfChoice: { 'honnoji': 'honnoujiAverted' },
  // 本能寺型：領地分割と後継選択を HONNOUJI_SUCCESSION_DATA で行うイベント（isHonnouji / chooseSuccessor フラグと同等）
  successionEvents: ['evt_1582_honnouji_yamazaki'],
  // その家に残る領国をすべて勝者へ移し、指定武将を落命させる（山崎の明智滅亡など）
  clanCollapse: {
    'evt_1582_yamazaki': { from: 'akechi', to: 'toyotomi', killOfficerIds: ['off_akechi_mitsuhide'], minTroops: 3000 }
  },
  // 史実を適用したときに立てるフラグと、呼ぶ改名処理（hook は app 側の許可リストにある名前だけ）
  onApply: {
    'evt_1560_okehazama': { flag: 'okehazamaOccurred', hook: 'updateTokugawaSurname' },
    'evt_1087_kanazawa': { flag: 'kanazawaOccurred', hook: 'updateKiyohiraSurname' }
  },
  // 効果プレビューに足す一文（史実適用時）
  acceptEffectLines: {
    'evt_1560_okehazama': ['松平が徳川を称する'],
    'evt_1582_yamazaki': ['明智光秀が討ち死にし、明智家は滅亡する']
  },
  // 「史実を適用しない」を当事者でプレーしているときの追加ボーナス
  playerRejectBonus: {
    'evt_1837_oshio_success_if': {
      clanId: 'oshio', gold: 2500, rice: 5000,
      previewLines: ['摂津・河内・和泉が大塩勢のものになる', '兵糧 +5,000、金 +2,500']
    }
  },
  // 年・季節ごとに再発しうる選択イベント
  repeatablePerSeason: ['great_harvest'],
  // 同じ季節の他イベントの後に回す選択イベント
  deferToSeasonEnd: ['gunshi_join', 'great_harvest'],
  // 1回のプレーで1度しか起きない選択イベント（セーブに記録。観戦モードでは起きない）（ui_fixed12）
  //  gunshi_join: 稀代の名軍師・陣中に仕官を乞う / nanban_trade: 南蛮船来航・新式鉄砲と火薬の交易（鉄砲伝来）
  oncePerPlaythrough: ['gunshi_join', 'nanban_trade']
};

// 本能寺の変：落命・領地分割・後継大名・家臣団の付け替え（すべて ID 完全一致）;
if (typeof window !== "undefined") window.HISTORICAL_EVENT_RULES = HISTORICAL_EVENT_RULES;

export const HONNOUJI_SUCCESSION_DATA = {
  deadOfficerIds: ['off_oda_nobunaga', 'off_oda_nobutada'],
  formerClan: 'oda',
  minTroops: 3000,
  territory: {
    yamashiro: 'akechi', tamba: 'akechi', tango: 'akechi', south_omi: 'akechi',
    harima: 'toyotomi', settsu: 'toyotomi', kawachi: 'toyotomi', izumi: 'toyotomi',
    yamato: 'toyotomi', tajima: 'toyotomi', inaba: 'toyotomi', awaji: 'toyotomi',
    echizen: 'shibata', kaga: 'shibata', noto: 'shibata', north_omi: 'toyotomi', wakasa: 'shibata', hida: 'shibata',
    owari: 'oda', mino: 'oda', ise: 'oda', shima: 'oda', iga: 'oda',
    kai: 'tokugawa', south_shinano: 'tokugawa', north_shinano: 'sanada', kozuke: 'hojo'
  },
  // 後継大名本人。houseHeir は旧主家を継ぐ当主（信雄）。見つからなければ旧主家の家臣から立てる
  successors: [
    { clanId: 'toyotomi', officerIds: ['off_toyotomi_hideyoshi'] },
    { clanId: 'akechi', officerIds: ['off_akechi_mitsuhide'] },
    { clanId: 'shibata', officerIds: ['off_shibata_katsuie'] },
    { clanId: 'oda', officerIds: ['off_oda_nobukatsu'], houseHeir: true }
  ],
  // 家臣団の付け替え（上から順に判定）
  retainers: [
    { clanId: 'toyotomi', officerIds: [
      'off_toyotomi_hideyoshi', 'off_toyotomi_hidenaga', 'off_toyotomi_hidetsugu',
      'off_kuroda_kanbei', 'off_kuroda_nagamasa', 'off_takenaka_hanbei',
      'off_ishida_mitsunari', 'off_otani_yoshitsugu', 'off_fukushima_masanori',
      'off_kato_kiyomasa', 'off_hachisuka_koroku', 'off_asano_nagamasa',
      'off_yamauchi_kazutoyo', 'off_kato_yoshiaki', 'off_wakisaka_yasuharu',
      'off_katagiri_katsumoto', 'off_sengoku_hidehisa', 'off_hori_hidemasa',
      'off_dm_ukita_1582', 'off_konishi_yukinaga', 'off_ono_harunaga'
    ] },
    { clanId: 'akechi', officerIds: ['off_akechi_mitsuhide', 'off_jd_018'] },
    { clanId: 'shibata', officerIds: [
      'off_shibata_katsuie', 'off_maeda_toshiie', 'off_sassa_narimasa',
      'off_sakuma_morimasa', 'off_kanamori_nagachika'
    ] }
  ],
  successorOptions: [
    { clanId: 'toyotomi', name: '羽柴秀吉', title: '中国大返し・山崎の戦い', desc: '備中高松から電撃の中国大返し！光秀を討ち信長の後継者として天下統一を目指す。' },
    { clanId: 'akechi', name: '明智光秀', title: '敵は本能寺にあり', desc: '本能寺の変を断行！山崎の決戦に勝利して三日天下の汚名を雪ぎ、新たな武家幕府を築く。' },
    { clanId: 'shibata', name: '柴田勝家', title: '織田家筆頭宿老の覚悟', desc: '越前北ノ庄城より号令！筆頭宿老として不届き者を征伐し、織田家臣団の頂点に立つ。' },
    { clanId: 'oda', name: '織田信雄', title: '織田家正統の継承', desc: '織田家の嫡流として尾張・美濃の遺領を固守し、徳川と同盟して天下の正統を守る。' }
  ],
  log: '【天下動乱・跡継ぎ勢力分裂】織田信長公の落命に伴い、羽柴・明智・柴田・織田信雄の各後継大名に諸将の所属先が再編されました！'
};

// 同一人物の別名（改名・賜姓・表記ゆれ）。当主名の照合はこの完全一致グループだけで行い、部分一致は使わない;
if (typeof window !== "undefined") window.HONNOUJI_SUCCESSION_DATA = HONNOUJI_SUCCESSION_DATA;

export const LEADER_NAME_ALIASES = [
  ['羽柴秀吉', '豊臣秀吉', '木下藤吉郎'],
  ['羽柴秀長', '豊臣秀長'],
  ['羽柴秀次', '豊臣秀次'],
  ['羽柴秀頼', '豊臣秀頼'],
  ['清原清衡', '藤原清衡', '清原清衝', '藤原清衝'],
  ['徳川家康', '松平元康'],
  ['津軽為信', '大浦為信'],
  ['由比正雪', '由井正雪'],
  ['天草四郎', '天草四郎時貞'],
  ['安倍頼時', '安倍頼良'],
  ['山名宗全', '山名持豊'],
  ['石川高信', '南部高信', '田子高信'],
  ['伊東祐堯', '伊東祐尭'],
  ['今川氏堯', '今川氏尭']
];

// 羽柴⇔豊臣の改姓対象（ID → 名）。苗字の前方一致では選ばない;
if (typeof window !== "undefined") window.LEADER_NAME_ALIASES = LEADER_NAME_ALIASES;

// 改姓で家名が変わる家（勢力IDは同じまま、年代で家名・当主名を切り替える。GameState.updateClanNameEras）
export const CLAN_NAME_ERAS = {
  // 大浦為信は近衛前久の猶子となって姓を大浦から津軽に改めた（ja.wikipedia「津軽為信」。弘前藩主 1590年〜）
  tsugaru: {
    switchYear: 1590,
    before: { family: '大浦家', officers: { 'off_tsugaru_tamenobu': '大浦為信' } },
    after: { family: '津軽家', officers: { 'off_tsugaru_tamenobu': '津軽為信' } },
    log: '📜【改姓】大浦為信公は近衛前久の猶子となり、姓を大浦から「津軽」に改めました。大浦家はこれより「津軽家」を称します。'
  }
};
if (typeof window !== "undefined") window.CLAN_NAME_ERAS = CLAN_NAME_ERAS;

export const TOYOTOMI_SURNAME_OFFICERS = {
  'off_toyotomi_hideyoshi': '秀吉',
  'off_toyotomi_hidenaga': '秀長',
  'off_toyotomi_hidetsugu': '秀次'
};

// 清原→藤原の復姓対象（ID 完全一致）;
if (typeof window !== "undefined") window.TOYOTOMI_SURNAME_OFFICERS = TOYOTOMI_SURNAME_OFFICERS;

export const KIYOHIRA_OFFICER_IDS = ['off_fujiwara_kiyohira'];

// 秀吉の家の家督順（ID 完全一致。秀頼→秀次→秀長）;
if (typeof window !== "undefined") window.KIYOHIRA_OFFICER_IDS = KIYOHIRA_OFFICER_IDS;

export const HIDEYOSHI_HEIR_ORDER_IDS = ['off_dm_toyotomi_1600', 'off_toyotomi_hideyori', 'off_toyotomi_hidetsugu', 'off_toyotomi_hidenaga'];

// 地方ごとの北→南の並び（蝦夷から薩摩）。緯度が無いときの予備;
if (typeof window !== "undefined") window.HIDEYOSHI_HEIR_ORDER_IDS = HIDEYOSHI_HEIR_ORDER_IDS;

export const PROVINCE_NORTH_TO_SOUTH = [
  'ezo',
  'tsugaru', 'mutsu', 'ugo', 'rikuchu', 'uzen', 'rikuzen', 'iwashiro', 'iwaki',
  'sado', 'echigo', 'noto', 'etchu', 'kaga', 'echizen', 'wakasa',
  'shimotsuke', 'hitachi', 'kozuke', 'shimousa', 'musashi', 'kazusa', 'sagami', 'awa_boshu',
  'north_shinano', 'south_shinano', 'hida', 'kai', 'mino', 'owari', 'izu', 'suruga', 'mikawa', 'totomi',
  'tango', 'north_omi', 'south_omi', 'tamba', 'yamashiro', 'iga', 'ise', 'settsu', 'yamato', 'kawachi', 'shima', 'izumi', 'awaji', 'kii',
  'oki', 'inaba', 'tajima', 'hoki', 'izumo', 'mimasaka', 'iwami', 'harima', 'bicchu', 'aki', 'bizen', 'bingo', 'nagato', 'suo',
  'sanuki', 'awa_shikoku', 'iyo', 'tosa',
  'tsushima', 'buzen', 'chikuzen', 'chikugo', 'hizen', 'bungo', 'higo', 'osumi', 'hyuga', 'satsuma', 'ryukyu'
];

// 各国の中心（国府・主城）のおおよその北緯。勢力選択画面を北から並べる鍵（地図SVGは傾いているので y 座標は使わない）;
if (typeof window !== "undefined") window.PROVINCE_NORTH_TO_SOUTH = PROVINCE_NORTH_TO_SOUTH;

export const PROVINCE_LATITUDE = {
  ezo: 41.43, tsugaru: 40.60, mutsu: 40.40, rikuchu: 39.70, ugo: 39.72, rikuzen: 38.27, uzen: 38.25,
  iwashiro: 37.49, iwaki: 37.05, sado: 38.02, echigo: 37.14, noto: 37.05, etchu: 36.70, kaga: 36.56,
  echizen: 36.06, wakasa: 35.50, hitachi: 36.37, shimotsuke: 36.56, kozuke: 36.39, musashi: 35.75,
  shimousa: 35.72, kazusa: 35.40, awa_boshu: 35.00, sagami: 35.25, izu: 34.97, suruga: 34.98, kai: 35.66,
  north_shinano: 36.64, south_shinano: 36.00, hida: 36.14, mino: 35.43, totomi: 34.71, mikawa: 34.95,
  owari: 35.18, ise: 34.73, shima: 34.48, iga: 34.77, north_omi: 35.38, south_omi: 35.12, yamashiro: 35.01,
  yamato: 34.68, kii: 34.23, kawachi: 34.50, izumi: 34.46, settsu: 34.69, tamba: 35.05, tango: 35.53,
  tajima: 35.46, harima: 34.83, inaba: 35.50, hoki: 35.43, izumo: 35.35, iwami: 34.80, mimasaka: 35.06,
  bizen: 34.66, bicchu: 34.75, bingo: 34.49, aki: 34.45, suo: 34.18, nagato: 34.30, oki: 36.20,
  sanuki: 34.34, awa_shikoku: 34.07, iyo: 33.84, tosa: 33.56, awaji: 34.35, tsushima: 34.20,
  buzen: 33.75, chikuzen: 33.59, chikugo: 33.30, hizen: 33.25, bungo: 33.24, higo: 32.80,
  hyuga: 32.00, satsuma: 31.60, osumi: 31.40, ryukyu: 26.21
};

// 時代で本拠が移った家（その年以降の本拠）。領内にあるものを新しい順に採り、無ければ CLAN_CAPITAL_PROVINCES へ;
if (typeof window !== "undefined") window.PROVINCE_LATITUDE = PROVINCE_LATITUDE;

export const CLAN_CAPITAL_ERAS = {
  taira: [[1100, 'ise'], [1168, 'settsu']],
  ashikaga: [[1333, 'shimotsuke'], [1336, 'yamashiro']],
  godaiho: [[1331, 'yamato']],
  oda: [[1555, 'owari'], [1567, 'mino'], [1576, 'south_omi'], [1583, 'owari']],
  tokugawa: [[1560, 'mikawa'], [1570, 'totomi'], [1586, 'suruga'], [1590, 'musashi']],
  date: [[1591, 'rikuzen']],
  uesugi: [[1598, 'iwashiro'], [1601, 'uzen']],
  mori: [[1601, 'nagato']]
};


// ============================================================================
// 陣形マスター（三すくみ）／特産シナジー／地形キーワード — app はこれを読むだけ
// ============================================================================;
if (typeof window !== "undefined") window.CLAN_CAPITAL_ERAS = CLAN_CAPITAL_ERAS;

export const FORMATION_TYPES = {
  assault: { id: 'assault', label: '突撃系', keys: ['gyorin', 'hoshi', 'kuruma'] },
  encircle: { id: 'encircle', label: '包囲系', keys: ['kakuyoku', 'ganko'] },
  defense: { id: 'defense', label: '防御系', keys: ['hoen'] }
};;
if (typeof window !== "undefined") window.FORMATION_TYPES = FORMATION_TYPES;

export const FORMATIONS_DATA = {
  gyorin:  { key: 'gyorin',  name: '魚鱗', label: '魚鱗 (突撃突破)', type: 'assault',  desc: '中央突破の突撃陣' },
  hoshi:   { key: 'hoshi',   name: '鋒矢', label: '鋒矢 (中央直撃)', type: 'assault',  desc: '一点突破の突撃陣' },
  kuruma:  { key: 'kuruma',  name: '車懸', label: '車懸 (波状連撃)', type: 'assault',  desc: '波状の連撃突撃' },
  kakuyoku:{ key: 'kakuyoku',name: '鶴翼', label: '鶴翼 (包囲殲滅)', type: 'encircle', desc: '両翼包囲の陣' },
  ganko:   { key: 'ganko',   name: '雁行', label: '雁行 (鉄砲斉射)', type: 'encircle', desc: '斜線斉射の包囲射撃' },
  hoen:    { key: 'hoen',    name: '方円', label: '方円 (鉄壁防御)', type: 'defense',  desc: '全周防御の鉄壁陣' }
};

// 突撃 > 包囲 > 防御 > 突撃。dealt=与ダメ倍率, taken=被ダメ倍率;
if (typeof window !== "undefined") window.FORMATIONS_DATA = FORMATIONS_DATA;

export const FORMATION_RPS = {
  assault:  { beats: 'encircle', losesTo: 'defense' },
  encircle: { beats: 'defense',  losesTo: 'assault' },
  defense:  { beats: 'assault',  losesTo: 'encircle' },
  advantage:  { dealt: 1.18, taken: 0.90 },
  disadvantage:{ dealt: 0.85, taken: 1.12 },
  neutral:    { dealt: 1.00, taken: 1.00 }
};

// 地形キーワード（specialty / culturalNotes / region 照合）。±10%程度;
if (typeof window !== "undefined") window.FORMATION_RPS = FORMATION_RPS;

export const TERRAIN_KEYWORDS = {
  plain:    { label: '平地', boost: 'assault',  keywords: /平原|平野|盆地|田園|穀倉|米どころ|大平野|沃野|平城/ },
  mountain: { label: '山地', boost: 'defense',  keywords: /山|峠|峡|山城|山地|嶺|峰|険|要塞|金坑|銀山|金山|鉱山/ },
  coast:    { label: '沿岸', boost: 'encircle', keywords: /港|湊|湾|海|島|水軍|船|黒潮|瀬戸|南蛮|貿易|舟運|湖|川/ }
};;
if (typeof window !== "undefined") window.TERRAIN_KEYWORDS = TERRAIN_KEYWORDS;

export const SPECIALTY_SYNERGY = [
  {
    id: 'iron',
    label: '鉄・刀剣産地',
    keywords: /鉄|刀|刃物|鉄器|砂鉄|甲冑|武具|銅|兵器/,
    effects: { militaryGoldDiscount: 0.20 } // 軍備金コスト -20%
  },
  {
    id: 'rice',
    label: '米・穀倉',
    keywords: /米|穀|稲|縮|穀倉|米どころ|新田/,
    effects: { autumnRiceBonus: 0.20 } // 秋収穫 +20%
  },
  {
    id: 'port',
    label: '港・南蛮貿易',
    keywords: /港|湊|堺|博多|平戸|南蛮|貿易|海運|水軍/,
    effects: { autumnDefenseBonus: 2, autumnTroopBonus: 80, gunSupplyFlag: true }
  },
  {
    id: 'mine',
    label: '金山・銀山',
    keywords: /金山|銀山|金銀|金坑|生野|佐渡|石見|甲州金/,
    provinceIds: ['sado', 'iwami', 'tajima', 'kai'],
    effects: { seasonGoldBonus: 100 } // 毎季固定金収入ボーナス +100貫/国
  },
  {
    id: 'horse',
    label: '名馬産地',
    keywords: /南部馬|木曽馬|甲州馬|馬|牧|名馬/,
    provinceIds: ['mutsu', 'kai', 'north_shinano', 'south_shinano'],
    effects: { assaultBonus: 0.25 } // 突撃系攻撃力底上げ +25%
  },
  {
    id: 'gunsmith',
    label: '鉄砲鍛冶・南蛮港町',
    keywords: /堺|国友|種子島|長崎|鉄砲|砲術|火縄/,
    provinceIds: ['osumi', 'izumi', 'north_omi', 'south_omi', 'hizen'],
    effects: { shootBonus: 0.30, commerceGoldBonus: 80 } // 射撃強化+30%・商業金収入ボーナス
  }
];;
if (typeof window !== "undefined") window.SPECIALTY_SYNERGY = SPECIALTY_SYNERGY;

export const IKKI_ORDER_THRESHOLD = 50;;
if (typeof window !== "undefined") window.IKKI_ORDER_THRESHOLD = IKKI_ORDER_THRESHOLD;

export const CASTELLAN_INDEPENDENCE_CHANCE = 0.32;;
if (typeof window !== "undefined") window.CASTELLAN_INDEPENDENCE_CHANCE = CASTELLAN_INDEPENDENCE_CHANCE;

export const RONIN_BLANK_UPRISING_CHANCE = 0.28;


// ===== 史実配置の補正（武将の所属・城代） =====
// 朝廷・院・公家方。城代の配置先を理由に武家へ吸収しない（app の一般一門吸収で参照）;
if (typeof window !== "undefined") window.RONIN_BLANK_UPRISING_CHANCE = RONIN_BLANK_UPRISING_CHANCE;

export const NON_ABSORBABLE_CLANS = ['heian_court', 'court', 'godaiho', 'gotoba_in', 'goshirakawa_in', 'sutoku_in'];

// 主家が地図にない年代の仕官先（主家が地図にあればそちらが優先）;
if (typeof window !== "undefined") window.NON_ABSORBABLE_CLANS = NON_ABSORBABLE_CLANS;

export const CLAN_SERVICE_FALLBACKS = [
  { clanIds: ['shibata'], setClanId: 'oda', fromYear: 1540, toYear: 1582 },
  { clanIds: ['toyotomi'], setClanId: 'oda', fromYear: 1540, toYear: 1582 },
  { clanIds: ['maeda'], setClanId: 'oda', fromYear: 1551, toYear: 1582 },
  { clanIds: ['sassa'], setClanId: 'oda', fromYear: 1550, toYear: 1582 },
  { clanIds: ['akechi'], setClanId: 'oda', fromYear: 1568, toYear: 1582 },
  { clanIds: ['sanada'], setClanId: 'takeda', fromYear: 1550, toYear: 1582 },
  { clanIds: ['kuroda'], setClanId: 'akamatsu', fromYear: 1560, toYear: 1577 },
  { clanIds: ['hatakeyama_bishu', 'hatakeyama_soshu', 'hatakeyama_noto'], setClanId: 'hatakeyama' },
  { clanIds: ['hatakeyama'], setClanId: 'hatakeyama_bishu', fromYear: 1450 }
];

if (typeof window !== "undefined") window.CLAN_SERVICE_FALLBACKS = CLAN_SERVICE_FALLBACKS;

(function () {
  const extraRules = [

  // --- Historical Fixes for Scenarios (1274, 1359, 1438, 1467, 1495, 1531, 1555, 1560, 1570) ---
  {
    id: 'tanemune_rikuzen_1555',
    officerIds: ['off_date_tanemune_early'],
    scenarioIds: ['1555'],
    setClanId: 'date',
    setDefaultProv: 'rikuzen',
    setAssignedProv: 'rikuzen',
    setDaimyo: false
  },
  {
    id: 'amago_haruhisa_1560',
    officerIds: ['off_dm_amago_1546'],
    scenarioIds: ['1560'],
    setClanId: 'amago',
    setDefaultProv: 'izumo',
    setAssignedProv: 'izumo',
    setDaimyo: true
  },
  {
    id: 'amago_yoshihisa_not_dm_1560',
    officerIds: ['off_dm_amago_1560'],
    scenarioIds: ['1560'],
    setClanId: 'amago',
    setDaimyo: false
  },
  {
    id: 'date_harumune_1560',
    officerIds: ['off_dm_date_1546'],
    scenarioIds: ['1560'],
    setClanId: 'date',
    setDefaultProv: 'rikuzen',
    setAssignedProv: 'rikuzen',
    setDaimyo: true
  },
  {
    id: 'date_terumune_not_dm_1560',
    officerIds: ['off_dm_date_1560'],
    scenarioIds: ['1560'],
    setClanId: 'date',
    setDaimyo: false
  },
  {
    id: 'chosokabe_kunichika_1560',
    officerIds: ['off_dm_chosokabe_1546'],
    scenarioIds: ['1560'],
    setClanId: 'chosokabe',
    setDefaultProv: 'tosa',
    setAssignedProv: 'tosa',
    setDaimyo: true
  },
  {
    id: 'chosokabe_motochika_not_dm_1560',
    officerIds: ['off_chosokabe_motochika'],
    scenarioIds: ['1560'],
    setClanId: 'chosokabe',
    setDaimyo: false
  },
  {
    id: 'uragami_munekage_1560',
    officerIds: ['off_dm_uragami_1546'],
    scenarioIds: ['1560'],
    setClanId: 'uragami',
    setDefaultProv: 'bizen',
    setAssignedProv: 'bizen',
    setDaimyo: true
  },
  {
    id: 'tachibana_dosetsu_chikuzen_1560',
    officerIds: ['off_tachibana_dosetsu'],
    scenarioIds: ['1560'],
    setClanId: 'otomo',
    setDefaultProv: 'chikuzen',
    setAssignedProv: 'chikuzen',
    setDaimyo: false
  },
  {
    id: 'satake_yoshishige_sengoku_1570',
    officerIds: ['off_satake_yoshishige'],
    scenarioIds: ['1570'],
    setClanId: 'satake',
    setDefaultProv: 'hitachi',
    setAssignedProv: 'hitachi',
    setDaimyo: true
  },
  {
    id: 'hatano_hideharu_1570',
    officerIds: ['off_hatano_hideharu'],
    scenarioIds: ['1570'],
    setClanId: 'hatano',
    setDefaultProv: 'tamba',
    setAssignedProv: 'tamba',
    setDaimyo: true
  },
  {
    id: 'shimazu_tadakuni_1438',
    officerIds: ['off_shimazu_tadakuni'],
    scenarioIds: ['1438'],
    setClanId: 'shimazu',
    setDefaultProv: 'satsuma',
    setAssignedProv: 'satsuma',
    setDaimyo: true
  },
  {
    id: 'rokkaku_mitsutsuna_1438',
    officerIds: ['off_rokkaku_mitsutsuna'],
    scenarioIds: ['1438'],
    setClanId: 'rokkaku',
    setDefaultProv: 'south_omi',
    setAssignedProv: 'south_omi',
    setDaimyo: true
  },
  {
    id: 'ashikaga_yoshinori_1438',
    officerIds: ['off_dm_ashikaga_1438'],
    scenarioIds: ['1438'],
    setClanId: 'ashikaga',
    setDefaultProv: 'yamashiro',
    setAssignedProv: 'yamashiro',
    setDaimyo: true
  },
  {
    id: 'ashikaga_yoshimasa_1467',
    officerIds: ['off_dm_ashikaga_1467'],
    scenarioIds: ['1467'],
    setClanId: 'ashikaga',
    setDefaultProv: 'yamashiro',
    setAssignedProv: 'yamashiro',
    setDaimyo: true
  },
  {
    id: 'uragami_muramune_1531',
    officerIds: ['off_uragami_muramune'],
    scenarioIds: ['1531'],
    setClanId: 'uragami',
    setDefaultProv: 'bizen',
    setAssignedProv: 'bizen',
    setDaimyo: true
  },
  {
    id: 'uragami_munekage_not_dm_1531',
    officerIds: ['off_dm_uragami_1546'],
    scenarioIds: ['1531'],
    setClanId: 'uragami',
    setDaimyo: false
  },
  {
    id: 'kikuchi_takemitsu_1359',
    officerIds: ['off_kikuchi_takemitsu'],
    scenarioIds: ['1359'],
    setClanId: 'kikuchi',
    setDefaultProv: 'higo',
    setAssignedProv: 'higo',
    setDaimyo: true
  },
  {
    id: 'ashikaga_motouji_1359',
    officerIds: ['off_dm_kamakura_fu_1350'],
    scenarioIds: ['1359'],
    setClanId: 'kamakura_fu',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: true
  },
  {
    id: 'uesugi_noriaki_kozuke_1359',
    officerIds: ['off_uesugi_noriaki_first'],
    scenarioIds: ['1359'],
    setClanId: 'uesugi',
    setDefaultProv: 'kozuke',
    setAssignedProv: 'kozuke',
    setDaimyo: true
  },
  {
    id: 'hatakeyama_yoshinori_noto_1359',
    officerIds: ['off_hatakeyama_yoshinori'],
    scenarioIds: ['1359'],
    setClanId: 'hatakeyama',
    setDefaultProv: 'kii',
    setAssignedProv: 'kii',
    setDaimyo: false
  },
  {
    id: 'momoi_tadatsune_etchu_1359',
    officerIds: ['off_momoi_tadatsune'],
    scenarioIds: ['1359'],
    setClanId: 'ashikaga',
    setDefaultProv: 'etchu',
    setAssignedProv: 'etchu',
    setDaimyo: false
  },
  {
    id: 'yamana_toyosada_inaba_1555',
    officerIds: ['off_jd_010'],
    scenarioIds: ['1555'],
    setClanId: 'yamana',
    setDefaultProv: 'inaba',
    setAssignedProv: 'inaba',
    setDaimyo: false
  },
  {
    id: 'isshiki_yoshimichi_tango_1546',
    officerIds: ['off_isshiki_yoshimichi'],
    scenarioIds: ['1546'],
    setClanId: 'isshiki',
    setDefaultProv: 'tango',
    setAssignedProv: 'tango',
    setDaimyo: true
  },
  {
    id: 'yamana_suketoyo_tajima_1546',
    officerIds: ['off_dm_yamana_1546', 'off_jd_014'],
    scenarioIds: ['1546'],
    setClanId: 'yamana',
    setDefaultProv: 'tajima',
    setAssignedProv: 'tajima',
    setDaimyo: true
  },
  {
    id: 'takeda_nobutoyo_wakasa_1546',
    officerIds: ['off_takeda_nobutoyo_wakasa'],
    scenarioIds: ['1546'],
    setClanId: 'takeda_wakasa',
    setDefaultProv: 'wakasa',
    setAssignedProv: 'wakasa',
    setDaimyo: true
  },
  {
    id: 'ashikaga_yoshiteru_yamashiro_1546',
    officerIds: ['off_ashikaga_yoshiteru'],
    scenarioIds: ['1546'],
    setClanId: 'ashikaga',
    setDefaultProv: 'yamashiro',
    setAssignedProv: 'yamashiro',
    setDaimyo: true
  },
  {
    id: 'hosokawa_masamoto_settsu_1495',
    officerIds: ['off_hosokawa_masamoto'],
    scenarioIds: ['1495', '1493'],
    setClanId: 'hosokawa',
    setDefaultProv: 'settsu',
    setAssignedProv: 'settsu',
    setDaimyo: true
  },
  {
    id: 'uesugi_kenshin_echigo_1546',
    officerIds: ['off_uesugi_kenshin'],
    scenarioIds: ['1546'],
    setClanId: 'uesugi',
    setDefaultProv: 'echigo',
    setAssignedProv: 'echigo',
    setDaimyo: true
  },
  {
    id: 'echigo_retainers_1546',
    officerIds: [
      'off_kakizaki_kageie',
      'off_usami_sadamitsu',
      'off_amakasu_kagemochi',
      'off_jd_305',
      'off_honjo_shigenaga',
      'off_dm_nagao_1546'
    ],
    scenarioIds: ['1546'],
    setClanId: 'uesugi',
    setDefaultProv: 'echigo',
    setAssignedProv: 'echigo',
    setDaimyo: false
  },
  {
    id: 'nagano_narimasa_kozuke_1546',
    officerIds: ['off_nagano_narimasa', 'off_jd_251'],
    scenarioIds: ['1546'],
    setClanId: 'yamanouchi',
    setDefaultProv: 'kozuke',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'kodera_norimoto_harima_1495',
    officerIds: ['off_succ_akamatsu_1440_0'],
    scenarioIds: ['1495', '1493'],
    setClanId: 'akamatsu',
    setDefaultProv: 'harima',
    setAssignedProv: 'harima',
    setDaimyo: false
  },
  {
    id: 'iwamatsu_iezumi_kozuke_1495',
    officerIds: ['off_iwamatsu_iezumi'],
    scenarioIds: ['1495', '1493'],
    setClanId: 'uesugi',
    setDefaultProv: 'kozuke',
    setAssignedProv: 'kozuke',
    setDaimyo: false
  },
  {
    id: 'ashikaga_yoshimasa_yamashiro_1467',
    officerIds: ['off_dm_ashikaga_1467'],
    scenarioIds: ['1467'],
    setClanId: 'ashikaga',
    setDefaultProv: 'yamashiro',
    setAssignedProv: 'yamashiro',
    setDaimyo: true
  },
  {
    id: 'yamana_sozen_tajima_1467',
    officerIds: ['off_yamana_sozen'],
    scenarioIds: ['1467'],
    setClanId: 'yamana',
    setDefaultProv: 'tajima',
    setAssignedProv: 'tajima',
    setDaimyo: true
  },
  {
    id: 'hosokawa_katsumoto_settsu_1467',
    officerIds: ['off_hosokawa_katsumoto'],
    scenarioIds: ['1467'],
    setClanId: 'hosokawa',
    setDefaultProv: 'settsu',
    setAssignedProv: 'settsu',
    setDaimyo: true
  },
  {
    id: 'hatano_kiyohide_tamba_1467',
    officerIds: ['off_jd_401'],
    scenarioIds: ['1467'],
    setClanId: 'hosokawa',
    setDefaultProv: 'tamba',
    setAssignedProv: 'tamba',
    setDaimyo: false
  },
  {
    id: 'isshiki_yoshinori_tango_1467',
    officerIds: ['off_isshiki_yoshinori'],
    scenarioIds: ['1467'],
    setClanId: 'isshiki',
    setDefaultProv: 'tango',
    setAssignedProv: 'tango',
    setDaimyo: true
  },
  {
    id: 'takeda_nobukata_wakasa_1467',
    officerIds: ['off_jd_007'],
    scenarioIds: ['1467'],
    setClanId: 'takeda_wakasa',
    setDefaultProv: 'wakasa',
    setAssignedProv: 'wakasa',
    setDaimyo: true
  },
  {
    id: 'toki_shigeyori_mino_1467',
    officerIds: ['off_dm_toki_1467'],
    scenarioIds: ['1467'],
    setClanId: 'toki',
    setDefaultProv: 'mino',
    setAssignedProv: 'mino',
    setDaimyo: true
  },
  {
    id: 'satomi_yoshizane_awa_1467',
    officerIds: ['off_succ_satomi_1340_151'],
    scenarioIds: ['1467'],
    setClanId: 'satomi',
    setDefaultProv: 'awa_boshu',
    setAssignedProv: 'awa_boshu',
    setDaimyo: true
  },
  {
    id: 'kyogoku_mochikiyo_north_omi_1467',
    officerIds: ['off_dm_kyogoku_1331'],
    scenarioIds: ['1467'],
    setClanId: 'kyogoku',
    setDefaultProv: 'north_omi',
    setAssignedProv: 'north_omi',
    setDaimyo: true
  },
  {
    id: 'amago_kiyosada_izumo_1467',
    officerIds: ['off_amago_kiyosada'],
    scenarioIds: ['1467'],
    setClanId: 'kyogoku',
    setDefaultProv: 'izumo',
    setAssignedProv: 'izumo',
    setDaimyo: false
  },
  {
    id: 'miki_naoyori_hida_1495',
    officerIds: ['off_jd_248'],
    scenarioIds: ['1495', '1493'],
    setClanId: 'anekoji',
    setDefaultProv: 'hida',
    setAssignedProv: 'hida',
    setDaimyo: true
  },
  {
    id: 'nagao_tamekage_echigo_1531',
    officerIds: ['off_nagao_tamekage'],
    scenarioIds: ['1531'],
    setClanId: 'nagao',
    setDefaultProv: 'echigo',
    setAssignedProv: 'echigo',
    setDaimyo: true
  },
  {
    id: 'togashi_mochiharu_kaga_1438',
    officerIds: ['off_togashi_mochiharu'],
    scenarioIds: ['1438'],
    setClanId: 'togashi',
    setDefaultProv: 'kaga',
    setAssignedProv: 'kaga',
    setDaimyo: true
  },
  {
    id: 'nagao_kagenobu_echigo_1438',
    officerIds: ['off_nagao_kagenobu'],
    scenarioIds: ['1438'],
    setClanId: 'uesugi',
    setDefaultProv: 'echigo',
    setAssignedProv: 'echigo',
    setDaimyo: false
  },
  {
    id: 'saito_myochin_mino_1438_1467',
    officerIds: ['off_saito_myochin'],
    scenarioIds: ['1438', '1467'],
    setClanId: 'toki',
    setDefaultProv: 'mino',
    setAssignedProv: 'mino',
    setDaimyo: false
  },
  {
    id: 'toki_mochiyori_mino_1438',
    officerIds: ['off_dm_toki_1438'],
    scenarioIds: ['1438'],
    setClanId: 'toki',
    setDefaultProv: 'mino',
    setAssignedProv: 'mino',
    setDaimyo: true
  },
  {
    id: 'satomi_yoshizane_awa_1438',
    officerIds: ['off_succ_satomi_1340_151'],
    scenarioIds: ['1438'],
    setClanId: 'satomi',
    setDefaultProv: 'awa_boshu',
    setAssignedProv: 'awa_boshu',
    setDaimyo: true
  },
  {
    id: 'takeda_nobunaga_kazusa_1438',
    officerIds: ['off_jd_369'],
    scenarioIds: ['1438'],
    setClanId: 'takeda_kazusa',
    setDefaultProv: 'kazusa',
    setAssignedProv: 'kazusa',
    setDaimyo: true
  },
  {
    id: 'yuki_ujiitomo_shimousa_1438',
    officerIds: ['off_yuki_ujiitomo'],
    scenarioIds: ['1438'],
    setClanId: 'yuki',
    setDefaultProv: 'shimousa',
    setAssignedProv: 'shimousa',
    setDaimyo: true
  },
  {
    id: 'amago_mochihisa_izumo_1438',
    officerIds: ['off_amago_mochihisa'],
    scenarioIds: ['1438'],
    setClanId: 'kyogoku',
    setDefaultProv: 'izumo',
    setAssignedProv: 'izumo',
    setDaimyo: false
  },
  {
    id: 'enyo_officers_kyogoku_1438',
    officerIds: ['off_enyo_shukiyo', 'off_enyo_kiyotsuna'],
    scenarioIds: ['1438'],
    setClanId: 'kyogoku',
    setDefaultProv: 'izumo',
    clearAssignment: true,
    setDaimyo: false
  },
  {
    id: 'yamana_morouji_tamba_1359',
    officerIds: ['off_yamana_morouji'],
    scenarioIds: ['1359'],
    setClanId: 'yamana',
    setDefaultProv: 'tamba',
    setAssignedProv: 'tamba',
    setDaimyo: false
  },
  {
    id: 'yamana_tokihiro_tamba_1391',
    officerIds: ['off_yamana_tokihiro'],
    scenarioIds: ['1391'],
    setClanId: 'yamana',
    setDefaultProv: 'tamba',
    setAssignedProv: 'tamba',
    setDaimyo: true
  },
  {
    id: 'yamana_ujikiyo_tajima_1391',
    officerIds: ['off_yamana_ujikiyo'],
    scenarioIds: ['1391'],
    setClanId: 'yamana',
    setDefaultProv: 'tajima',
    setAssignedProv: 'tajima',
    setDaimyo: false
  },
  {
    id: 'kyogoku_takakiyo_north_omi_1391',
    officerIds: ['off_kyogoku_takakiyo_1'],
    scenarioIds: ['1391'],
    setClanId: 'kyogoku',
    setDefaultProv: 'north_omi',
    setAssignedProv: 'north_omi',
    setDaimyo: true
  },
  {
    id: 'kyogoku_takahide_izumo_1391',
    officerIds: ['off_jd_325'],
    scenarioIds: ['1391'],
    setClanId: 'kyogoku',
    setDefaultProv: 'izumo',
    setAssignedProv: 'izumo',
    setDaimyo: false
  },
  {
    id: 'kyogoku_takamitsu_oki_1391',
    officerIds: ['off_kyogoku_takamitsu'],
    scenarioIds: ['1391'],
    setClanId: 'kyogoku',
    setDefaultProv: 'oki',
    setAssignedProv: 'oki',
    setDaimyo: false
  },
  {
    id: 'hosokawa_yorimoto_settsu_1391',
    officerIds: ['off_hosokawa_yorimoto'],
    scenarioIds: ['1391'],
    setClanId: 'hosokawa',
    setDefaultProv: 'settsu',
    setAssignedProv: 'settsu',
    setDaimyo: false
  },
  {
    id: 'atagi_awaji_1391',
    officerIds: ['off_jd_416'],
    scenarioIds: ['1391'],
    setClanId: 'hosokawa',
    setDefaultProv: 'awaji',
    setAssignedProv: 'awaji',
    setDaimyo: false
  },
  {
    id: 'ogasawara_nagamoto_south_shinano_1391',
    officerIds: ['off_ogasawara_nagamoto'],
    scenarioIds: ['1391'],
    setClanId: 'ogasawara',
    setDefaultProv: 'south_shinano',
    setAssignedProv: 'south_shinano',
    setDaimyo: true
  },
  {
    id: 'ogasawara_nagahide_south_shinano_1391',
    officerIds: ['off_succ_ogasawara_1365_112'],
    scenarioIds: ['1391'],
    setClanId: 'ogasawara',
    setDefaultProv: 'south_shinano',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'mori_sadachika_aki_1391',
    officerIds: ['off_succ2_mori_1360'],
    scenarioIds: ['1391'],
    setClanId: 'mori',
    setDefaultProv: 'aki',
    setAssignedProv: 'aki',
    setDaimyo: true
  },
  {
    id: 'masuda_kaneyo_iwami_1391',
    officerIds: ['off_masuda_kaneyo'],
    scenarioIds: ['1391'],
    setClanId: 'masuda',
    setDefaultProv: 'iwami',
    setAssignedProv: 'iwami',
    setDaimyo: true
  },
  {
    id: 'sugihara_bingo_1391',
    officerIds: ['off_jd_413'],
    scenarioIds: ['1391'],
    setClanId: 'yamana',
    setDefaultProv: 'bingo',
    setAssignedProv: 'bingo',
    setDaimyo: false
  },
  {
    id: 'kono_michiyuki_iyo_1391',
    officerIds: ['off_succ_kono_1355_72'],
    scenarioIds: ['1391'],
    setClanId: 'kono',
    setDefaultProv: 'iyo',
    setAssignedProv: 'iyo',
    setDaimyo: true
  },
  {
    id: 'chosokabe_nobukane_tosa_1391',
    officerIds: ['off_chosokabe_nobukane'],
    scenarioIds: ['1391'],
    setClanId: 'chosokabe',
    setDefaultProv: 'tosa',
    setAssignedProv: 'tosa',
    setDaimyo: true
  },
  {
    id: 'toki_yorimasu_mino_1391',
    officerIds: ['off_succ_toki_1375_198'],
    scenarioIds: ['1391'],
    setClanId: 'toki',
    setDefaultProv: 'mino',
    setAssignedProv: 'mino',
    setDaimyo: true
  },
  {
    id: 'kasai_mitsusada_rikuchu_1391',
    officerIds: ['off_kasai_mitsusada'],
    scenarioIds: ['1391'],
    setClanId: 'kasai',
    setDefaultProv: 'rikuchu',
    setAssignedProv: 'rikuchu',
    setDaimyo: true
  },
  {
    id: 'nanbu_nobunaga_mutsu_1391',
    officerIds: ['off_nanbu_nobunaga'],
    scenarioIds: ['1391'],
    setClanId: 'nanbu',
    setDefaultProv: 'mutsu',
    setAssignedProv: 'mutsu',
    setDaimyo: true
  },
  {
    id: 'nanbu_masamori_tsugaru_1391',
    officerIds: ['off_succ2_nanbu_1345'],
    scenarioIds: ['1391'],
    setClanId: 'nanbu',
    setDefaultProv: 'tsugaru',
    setAssignedProv: 'tsugaru',
    setDaimyo: false
  },
  {
    id: 'satake_yoshitoshi_hitachi_1391',
    officerIds: ['off_succ2_satake_1365'],
    scenarioIds: ['1391'],
    setClanId: 'satake',
    setDefaultProv: 'hitachi',
    setAssignedProv: 'hitachi',
    setDaimyo: true
  },
  {
    id: 'suwa_yorimitsu_south_shinano_1391',
    officerIds: ['off_succ_suwa_1365_185'],
    scenarioIds: ['1391'],
    setClanId: 'ogasawara',
    setDefaultProv: 'south_shinano',
    setAssignedProv: 'south_shinano',
    setDaimyo: false
  },
  {
    id: 'ando_norisue_ugo_1391',
    officerIds: ['off_ando_norisue'],
    scenarioIds: ['1391'],
    setClanId: 'ando',
    setDefaultProv: 'ugo',
    setAssignedProv: 'ugo',
    setDaimyo: true
  },
  {
    id: 'mogami_naoie_uzen_1391',
    officerIds: ['off_jd_383'],
    scenarioIds: ['1391'],
    setClanId: 'mogami',
    setDefaultProv: 'uzen',
    setAssignedProv: 'uzen',
    setDaimyo: true
  },
  {
    id: 'date_masamune_rikuzen_1391',
    officerIds: ['off_date_masamune_first'],
    scenarioIds: ['1391'],
    setClanId: 'date',
    setDefaultProv: 'rikuzen',
    setAssignedProv: 'rikuzen',
    setDaimyo: true
  },
  {
    id: 'utsunomiya_mitsutsuna_shimotsuke_1391',
    officerIds: ['off_utsunomiya_mitsutsuna'],
    scenarioIds: ['1391'],
    setClanId: 'utsunomiya',
    setDefaultProv: 'shimotsuke',
    setAssignedProv: 'shimotsuke',
    setDaimyo: true
  },
  {
    id: 'uesugi_norisada_echigo_1391',
    officerIds: ['off_uesugi_norisada'],
    scenarioIds: ['1391'],
    setClanId: 'uesugi',
    setDefaultProv: 'echigo',
    setAssignedProv: 'echigo',
    setDaimyo: true
  },
  {
    id: 'uesugi_zenshu_kozuke_1391',
    officerIds: ['off_uesugi_zenshu'],
    scenarioIds: ['1391'],
    setClanId: 'uesugi',
    setDefaultProv: 'kozuke',
    setAssignedProv: 'kozuke',
    setDaimyo: false
  },
  {
    id: 'takeda_nobuharu_kai_1391',
    officerIds: ['off_takeda_nobuharu'],
    scenarioIds: ['1391'],
    setClanId: 'takeda',
    setDefaultProv: 'kai',
    setAssignedProv: 'kai',
    setDaimyo: true
  },
  {
    id: 'yuki_naomitsu_shimousa_1391',
    officerIds: ['off_jd_368'],
    scenarioIds: ['1391'],
    setClanId: 'kamakura_fu',
    setDefaultProv: 'shimousa',
    setAssignedProv: 'shimousa',
    setDaimyo: false
  },
  {
    id: 'togashi_masaie_kaga_1391',
    officerIds: ['off_succ2_togashi_1365'],
    scenarioIds: ['1391'],
    setClanId: 'togashi',
    setDefaultProv: 'kaga',
    setAssignedProv: 'kaga',
    setDaimyo: true
  },
  {
    id: 'so_sugeshige_tsushima_1391',
    officerIds: ['off_succ_so_1330_173'],
    scenarioIds: ['1391'],
    setClanId: 'so',
    setDefaultProv: 'tsushima',
    setAssignedProv: 'tsushima',
    setDaimyo: true
  },
  {
    id: 'kikuchi_taketomo_higo_1391',
    officerIds: ['off_kikuchi_taketomo'],
    scenarioIds: ['1391'],
    setClanId: 'kikuchi',
    setDefaultProv: 'higo',
    setAssignedProv: 'higo',
    setDaimyo: true
  },
  {
    id: 'shoni_sadayori_hizen_1391',
    officerIds: ['off_jd_392'],
    scenarioIds: ['1391'],
    setClanId: 'shoni',
    setDefaultProv: 'hizen',
    setAssignedProv: 'hizen',
    setDaimyo: true
  },
  {
    id: 'isshiki_mitsunori_wakasa_1391',
    officerIds: ['off_jd_385'],
    scenarioIds: ['1391'],
    setClanId: 'isshiki',
    setDefaultProv: 'wakasa',
    setAssignedProv: 'wakasa',
    setDaimyo: true
  },
  {
    id: 'isshiki_norimitsu_mikawa_1391',
    officerIds: ['off_jd_404'],
    scenarioIds: ['1391'],
    setClanId: 'isshiki',
    setDefaultProv: 'mikawa',
    setAssignedProv: 'mikawa',
    setDaimyo: false
  },
  {
    id: 'hatakeyama_kunikiyo_kii_1359',
    officerIds: ['off_succ_hatakeyama_1300_22'],
    scenarioIds: ['1359'],
    setClanId: 'hatakeyama',
    setDefaultProv: 'kii',
    setAssignedProv: 'kii',
    setDaimyo: true
  },
  {
    id: 'kitabatake_akiyoshi_yamato_1359',
    officerIds: ['off_kitabatake_akiyoshi'],
    scenarioIds: ['1359'],
    setClanId: 'kitabatake',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: false
  },
  {
    id: 'shojo_suketsuna_bicchu_1359',
    officerIds: ['off_jd_418'],
    scenarioIds: ['1359'],
    setClanId: 'akamatsu',
    setDefaultProv: 'bicchu',
    setAssignedProv: 'bicchu',
    setDaimyo: false
  },
  {
    id: 'isshiki_norouji_tango_1359',
    officerIds: ['off_isshiki_norouji'],
    scenarioIds: ['1359'],
    setClanId: 'isshiki',
    setDefaultProv: 'tango',
    setAssignedProv: 'tango',
    setDaimyo: true
  },
  {
    id: 'anegakoji_ietsuna_hida_1359',
    officerIds: ['off_jd_224'],
    scenarioIds: ['1359'],
    setClanId: 'anekoji',
    setDefaultProv: 'hida',
    setAssignedProv: 'hida',
    setDaimyo: true
  },
  {
    id: 'namioka_akiyasu_tsugaru_1495',
    officerIds: ['off_nanbu_namioka_akiyasu'],
    scenarioIds: ['1495', '1493'],
    setClanId: 'namioka',
    setDefaultProv: 'tsugaru',
    setAssignedProv: 'tsugaru',
    setDaimyo: true
  },
  {
    id: 'nanbu_tokimasa_mutsu_1495',
    officerIds: ['off_dm_nanbu_1495'],
    scenarioIds: ['1495', '1493'],
    setClanId: 'nanbu',
    setDefaultProv: 'mutsu',
    setAssignedProv: 'mutsu',
    setDaimyo: true
  },
  {
    id: 'shimazu_officers_satsuma_1274',
    officerIds: ['off_shimazu_tadayoshi', 'off_shimazu_tadamune'],
    scenarioIds: ['1274'],
    setClanId: 'shimazu',
    setDefaultProv: 'satsuma',
    setAssignedProv: 'satsuma',
    setDaimyo: false
  },
  {
    id: 'hojo_munemasa_yamashiro_1274',
    officerIds: ['off_hojo_munemasa'],
    scenarioIds: ['1274'],
    setClanId: 'hojo_kamakura',
    setDefaultProv: 'yamashiro',
    setAssignedProv: 'yamashiro',
    setDaimyo: false
  },
  {
    id: 'kikuchi_chikugo_hojo_1274',
    officerIds: ['off_kikuchi_takefusa', 'off_succ2_kikuchi_1220'],
    scenarioIds: ['1274'],
    setClanId: 'hojo_kamakura',
    setDefaultProv: 'chikugo',
    setAssignedProv: 'chikugo',
    setDaimyo: false
  },
  {
    id: 'honma_tadaie_sado_1274',
    officerIds: ['off_succ_honma_1220_31'],
    scenarioIds: ['1274'],
    setClanId: 'hojo_kamakura',
    setDefaultProv: 'sado',
    setAssignedProv: 'sado',
    setDaimyo: false
  },
  {
    id: 'sho_suketsuna_bicchu_1331',
    officerIds: ['off_jd_418'],
    scenarioIds: ['1331'],
    setClanId: 'akamatsu',
    setDefaultProv: 'bicchu',
    setAssignedProv: 'bicchu',
    setDaimyo: false
  },
  {
    id: 'doi_michimasu_iyo_1331',
    officerIds: ['off_doi_michimasu'],
    scenarioIds: ['1331'],
    setClanId: 'kono',
    setDefaultProv: 'iyo',
    setAssignedProv: 'iyo',
    setDaimyo: false
  },
  {
    id: 'taira_morimune_ise_1331',
    officerIds: ['off_taira_morimune'],
    scenarioIds: ['1331'],
    setDefaultProv: 'ise',
    setAssignedProv: 'ise',
    setDaimyo: false
  },
  {
    id: 'hojo_hidetoki_chikuzen_1331',
    officerIds: ['off_hojo_hidetoki'],
    scenarioIds: ['1331'],
    setClanId: 'hojo_kamakura',
    setDefaultProv: 'chikuzen',
    setAssignedProv: 'chikuzen',
    setDaimyo: false
  },
  {
    id: 'shoni_officers_hizen_1331',
    officerIds: ['off_dm_shoni_1331', 'off_dm_shoni_1336'],
    scenarioIds: ['1331'],
    setClanId: 'shoni',
    setDefaultProv: 'hizen',
    setAssignedProv: 'hizen'
  },
  {
    id: 'utsunomiya_fuyutsuna_buzen_1331',
    officerIds: ['off_jd_233'],
    scenarioIds: ['1331'],
    setClanId: 'utsunomiya',
    setDefaultProv: 'buzen',
    setAssignedProv: 'buzen',
    setDaimyo: true
  },
  {
    id: 'otomo_officers_bungo_1331',
    officerIds: ['off_otomo_sadamune', 'off_jd_219'],
    scenarioIds: ['1331'],
    setClanId: 'otomo',
    setDefaultProv: 'bungo',
    setAssignedProv: 'bungo'
  },
  {
    id: 'nanbu_officers_mutsu_1531',
    officerIds: ['off_nanbu_harumasa', 'off_succ2_nanbu_1495'],
    scenarioIds: ['1531'],
    setClanId: 'nanbu',
    setDefaultProv: 'mutsu',
    setAssignedProv: 'mutsu'
  },
  {
    id: 'ando_kiyosue_tsugaru_1531',
    officerIds: ['off_succ_ando_1495_4'],
    scenarioIds: ['1531'],
    setClanId: 'ando',
    setDefaultProv: 'tsugaru',
    setAssignedProv: 'tsugaru'
  },
  {
    id: 'amago_kunihisa_izumo_1538',
    officerIds: ['off_amago_kunihisa'],
    scenarioIds: ['1538'],
    setClanId: 'amago',
    setDefaultProv: 'izumo',
    setAssignedProv: 'izumo'
  },
  {
    id: 'oura_tamenori_tsugaru_1538_1560',
    officerIds: ['off_jd_013'],
    scenarioIds: ['1538', '1546', '1555', '1560'],
    setClanId: 'tsugaru',
    setDefaultProv: 'tsugaru',
    setAssignedProv: 'tsugaru',
    setDaimyo: true
  },
  {
    id: 'tsugaru_tamenobu_tsugaru_1570_1582',
    officerIds: ['off_tsugaru_tamenobu'],
    scenarioIds: ['1570', '1573', '1576', '1577', '1582'],
    setClanId: 'tsugaru',
    setDefaultProv: 'tsugaru',
    setAssignedProv: 'tsugaru',
    setDaimyo: true
  },
  {
    id: 'kasai_masanobu_rikuchu_1467',
    officerIds: ['off_kasai_masanobu'],
    scenarioIds: ['1467'],
    setClanId: 'kasai',
    setDefaultProv: 'rikuchu',
    setAssignedProv: 'rikuchu',
    setDaimyo: true
  },
  {
    id: 'nanbu_mitsumasa_rikuchu_1467',
    officerIds: ['off_dm_nanbu_1467'],
    scenarioIds: ['1467'],
    setDefaultProv: 'rikuchu',
    setAssignedProv: 'rikuchu'
  },
  {
    id: 'isshiki_mitsunori_tango_1400',
    officerIds: ['off_jd_385'],
    scenarioIds: ['1400'],
    setClanId: 'isshiki',
    setDefaultProv: 'tango',
    setAssignedProv: 'tango',
    setDaimyo: true
  },
  {
    id: 'nobunaga_nobushige_tango_1400',
    officerIds: ['off_jd_407'],
    scenarioIds: ['1400'],
    setClanId: 'isshiki',
    setDefaultProv: 'tango',
    setAssignedProv: 'tango',
    setDaimyo: false
  },
  {
    id: 'nanbu_masanaga_mutsu_1359',
    officerIds: ['off_nanbu_masanaga'],
    scenarioIds: ['1359'],
    setClanId: 'nanbu',
    setDefaultProv: 'mutsu',
    setAssignedProv: 'mutsu',
    setDaimyo: false
  },
  {
    id: 'nanbu_nobumasa_mutsu_1359',
    officerIds: ['off_jd_241'],
    scenarioIds: ['1359'],
    setClanId: 'nanbu',
    setDefaultProv: 'mutsu',
    setAssignedProv: 'mutsu',
    setDaimyo: true
  },
  {
    id: 'jinbo_kunihisa_etchu_1391',
    officerIds: ['off_jd_402'],
    scenarioIds: ['1391'],
    setClanId: 'hatakeyama',
    setDefaultProv: 'etchu',
    setAssignedProv: 'etchu',
    setDaimyo: false
  },
  // 1391 Akamatsu Bicchu
  {
    id: 'sho_sukefusa_bicchu_1391',
    officerIds: ['off_jd_412'],
    scenarioIds: ['1391'],
    setClanId: 'akamatsu',
    setDefaultProv: 'bicchu',
    setAssignedProv: 'bicchu',
    setDaimyo: false
  },
  // 1391 Kitabatake Ise & Shima
  {
    id: 'kitabatake_akiyasu_ise_1391',
    officerIds: ['off_kitabatake_akiyasu'],
    scenarioIds: ['1391'],
    setClanId: 'kitabatake',
    setDefaultProv: 'ise',
    setAssignedProv: 'ise',
    setDaimyo: true
  },
  {
    id: 'kitabatake_akiyoshi_shima_1391',
    officerIds: ['off_kitabatake_akiyoshi'],
    scenarioIds: ['1391'],
    setClanId: 'kitabatake',
    setDefaultProv: 'shima',
    setAssignedProv: 'shima',
    setDaimyo: false
  },
  // 1391 Rokkaku South Omi
  {
    id: 'rokkaku_mitsutaka_south_omi_1391',
    officerIds: ['off_rokkaku_mitsutaka'],
    scenarioIds: ['1391'],
    setClanId: 'rokkaku',
    setDefaultProv: 'south_omi',
    setAssignedProv: 'south_omi',
    setDaimyo: true
  },
  // 1391 Kamakura-fu Ashikaga
  {
    id: 'ashikaga_ujimitsu_sagami_1391',
    officerIds: ['off_ashikaga_ujimitsu'],
    scenarioIds: ['1391'],
    setClanId: 'kamakura_fu',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: true
  },
  {
    id: 'ashikaga_mitsutaka_musashi_1391',
    officerIds: ['off_ashikaga_mitsutaka'],
    scenarioIds: ['1391'],
    setClanId: 'kamakura_fu',
    setDefaultProv: 'musashi',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'kano_izu_1391',
    officerIds: ['off_jd_405'],
    scenarioIds: ['1391'],
    setClanId: 'kamakura_fu',
    setDefaultProv: 'izu',
    setAssignedProv: 'izu',
    setDaimyo: false
  },
  {
    id: 'nanbu_masanaga_rikuchu_1391',
    officerIds: ['off_nanbu_masanaga'],
    scenarioIds: ['1391'],
    setClanId: 'nanbu',
    setDefaultProv: 'rikuchu',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'satomi_yoshinaga_awa_1391',
    officerIds: ['off_jd_403'],
    scenarioIds: ['1391'],
    setClanId: 'satomi',
    setDefaultProv: 'awa_boshu',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  // 1400 Suwa Yorimitsu South Shinano
  {
    id: 'suwa_yorimitsu_south_shinano_1400',
    officerIds: ['off_succ_suwa_1365_185'],
    scenarioIds: ['1400'],
    setClanId: 'ogasawara',
    setDefaultProv: 'south_shinano',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  // 1391 Satomi Awa
  {
    id: 'satomi_yoshinori_awa_1391',
    officerIds: ['off_satomi_yoshinori'],
    scenarioIds: ['1391'],
    setClanId: 'satomi',
    setDefaultProv: 'awa_boshu',
    setAssignedProv: 'awa_boshu',
    setDaimyo: true
  },
  // 1400 里見義則（安房・鎌倉公方足利氏配下）
  {
    id: 'satomi_yoshinori_kamakura_fu_1400',
    officerIds: ['off_satomi_yoshinori'],
    scenarioIds: ['1400'],
    setClanId: 'kamakura_fu',
    setDefaultProv: 'awa_boshu',
    setAssignedProv: 'awa_boshu',
    setDaimyo: false
  },
  // 1438 安東盛季（羽後配置・安東氏当主）
  {
    id: 'ando_morisue_ugo_1438',
    officerIds: ['off_ando_morisue'],
    scenarioIds: ['1438'],
    setClanId: 'ando',
    setDefaultProv: 'ugo',
    setAssignedProv: 'ugo',
    setDaimyo: true
  },
  // 1438 コシャマイン（蝦夷独立大名）
  {
    id: 'koshamain_ezo_daimyo_1438',
    officerIds: ['off_ezo_koshamain'],
    scenarioIds: ['1438'],
    setClanId: 'ezo_native',
    setDefaultProv: 'ezo',
    setAssignedProv: 'ezo',
    setDaimyo: true
  },
  // 1438 タニコシャ（蝦夷・コシャマイン配下）
  {
    id: 'tanikosha_ezo_vassal_1438',
    officerIds: ['off_ezo_tani'],
    scenarioIds: ['1438'],
    setClanId: 'ezo_native',
    setDefaultProv: 'ezo',
    setAssignedProv: 'ezo',
    setDaimyo: false
  },
  // 1467 南部政盛（陸奥配置・南部氏配下）
  {
    id: 'nanbu_masamori_mutsu_1467',
    officerIds: ['off_jd_370'],
    scenarioIds: ['1467'],
    setClanId: 'nanbu',
    setDefaultProv: 'mutsu',
    setAssignedProv: 'mutsu',
    setDaimyo: false
  },
  // 1467 安東政季（羽後配置・安東氏当主）
  {
    id: 'ando_masasue_ugo_1467',
    officerIds: ['off_dm_ando_1467'],
    scenarioIds: ['1467'],
    setClanId: 'ando',
    setDefaultProv: 'ugo',
    setAssignedProv: 'ugo',
    setDaimyo: true
  },
  // 1467 タニコシャ（蝦夷独立大名）
  {
    id: 'tanikosha_ezo_daimyo_1467',
    officerIds: ['off_ezo_tani'],
    scenarioIds: ['1467'],
    setClanId: 'ezo_native',
    setDefaultProv: 'ezo',
    setAssignedProv: 'ezo',
    setDaimyo: true
  },
  // 1467 足利成氏（下総・古河公方大名）
  {
    id: 'ashikaga_shigeuji_shimousa_1467',
    officerIds: ['off_ashikaga_shigeuji'],
    scenarioIds: ['1467'],
    setClanId: 'kamakura_fu',
    setDefaultProv: 'shimousa',
    setAssignedProv: 'shimousa',
    setDaimyo: true
  },
  // 1467 千葉氏・原胤房（下総・足利成氏配下）
  {
    id: 'chiba_hara_kamakura_fu_1467',
    officerIds: ['off_dm_chiba_1467', 'off_jd_006'],
    scenarioIds: ['1467'],
    setClanId: 'kamakura_fu',
    setDefaultProv: 'shimousa',
    setAssignedProv: 'shimousa',
    setDaimyo: false
  },
  // 1495 陶興房（周防配置・大内氏配下）
  {
    id: 'sue_okifusa_suo_1495',
    officerIds: ['off_sue_okifusa'],
    scenarioIds: ['1495', '1493'],
    setClanId: 'ouchi',
    setDefaultProv: 'suo',
    setAssignedProv: 'suo',
    setDaimyo: false
  },
  // 1391 Soma Iwaki
  {
    id: 'soma_noritane_iwaki_1391',
    officerIds: ['off_soma_noritane'],
    scenarioIds: ['1391'],
    setClanId: 'soma',
    setDefaultProv: 'iwaki',
    setAssignedProv: 'iwaki',
    setDaimyo: true
  },
  {
    id: 'okada_tanehisa_iwaki_1391',
    officerIds: ['off_okada_tanehisa'],
    scenarioIds: ['1391'],
    setClanId: 'soma',
    setDefaultProv: 'iwaki',
    setAssignedProv: 'iwaki',
    setDaimyo: false
  },
  // 1391 Ashina Iwashiro
  {
    id: 'ashina_akemori_iwashiro_1391',
    officerIds: ['off_ashina_akemori'],
    scenarioIds: ['1391'],
    setClanId: 'ashina',
    setDefaultProv: 'iwashiro',
    setAssignedProv: 'iwashiro',
    setDaimyo: true
  },
  {
    id: 'ashina_morimasa_iwashiro_1391',
    officerIds: ['off_succ_ashina_1380_7'],
    scenarioIds: ['1391'],
    setClanId: 'ashina',
    setDefaultProv: 'iwashiro',
    setAssignedProv: 'iwashiro',
    setDaimyo: false
  },
  // 1350 Updates
  {
    id: 'ashikaga_motouji_sagami_1350',
    officerIds: ['off_dm_kamakura_fu_1350'],
    scenarioIds: ['1350'],
    setClanId: 'kamakura_fu',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: true
  },
  {
    id: 'satomi_yoshitane_awa_1350',
    officerIds: ['off_satomi_yoshitane'],
    scenarioIds: ['1350'],
    setClanId: 'satomi',
    setDefaultProv: 'awa_boshu',
    setAssignedProv: 'awa_boshu',
    setDaimyo: true
  },
  {
    id: 'satake_sadayoshi_hitachi_1350',
    officerIds: ['off_dm_satake_1331'],
    scenarioIds: ['1350'],
    setClanId: 'satake',
    setDefaultProv: 'hitachi',
    setAssignedProv: 'hitachi',
    setDaimyo: true
  },
  {
    id: 'yuki_naomitsu_shimousa_1350',
    officerIds: ['off_jd_368'],
    scenarioIds: ['1350'],
    setClanId: 'kamakura_fu',
    setDefaultProv: 'shimousa',
    setAssignedProv: 'shimousa',
    setDaimyo: false
  },
  {
    id: 'anekoji_ietsuna_hida_1350',
    officerIds: ['off_jd_224'],
    scenarioIds: ['1350'],
    setClanId: 'anekoji',
    setDefaultProv: 'hida',
    setAssignedProv: 'hida',
    setDaimyo: true
  },
  {
    id: 'ko_no_moronao_yamashiro_1350',
    officerIds: ['off_ko_no_moronao'],
    scenarioIds: ['1350'],
    setClanId: 'ashikaga',
    setDefaultProv: 'yamashiro',
    setAssignedProv: 'yamashiro',
    setDaimyo: false
  },
  {
    id: 'ko_no_moroyasu_yamashiro_1350',
    officerIds: ['off_ko_no_moroyasu'],
    scenarioIds: ['1350'],
    setClanId: 'ashikaga',
    setDefaultProv: 'yamashiro',
    setAssignedProv: 'yamashiro',
    setDaimyo: false
  },
  {
    id: 'isshiki_norouji_tango_1350',
    officerIds: ['off_isshiki_norouji'],
    scenarioIds: ['1350'],
    setClanId: 'isshiki',
    setDefaultProv: 'tango',
    setAssignedProv: 'tango',
    setDaimyo: true
  },
  {
    id: 'ashina_naomori_iwashiro_1350',
    officerIds: ['off_ashina_naomori'],
    scenarioIds: ['1350'],
    setClanId: 'ashina',
    setDefaultProv: 'iwashiro',
    setAssignedProv: 'iwashiro',
    setDaimyo: true
  },
  {
    id: 'enyo_takasada_izumo_1350',
    officerIds: ['off_dm_enyo_1331'],
    scenarioIds: ['1350'],
    setClanId: 'kyogoku',
    setDefaultProv: 'izumo',
    setAssignedProv: 'izumo',
    setDaimyo: false
  },
  {
    id: 'masuda_iwami_1350',
    officerIds: ['off_masuda_kanemi', 'off_masuda_kaneyoshi'],
    scenarioIds: ['1350'],
    setClanId: 'masuda',
    setDefaultProv: 'iwami',
    setAssignedProv: 'iwami',
    setDaimyo: true
  },
  {
    id: 'hosokawa_kazuuji_awa_1350',
    officerIds: ['off_dm_hosokawa_1331'],
    scenarioIds: ['1350'],
    setClanId: 'hosokawa',
    setDefaultProv: 'awa_shikoku',
    setAssignedProv: 'awa_shikoku',
    setDaimyo: false
  },
  {
    id: 'mori_motoharu_aki_1350',
    officerIds: ['off_mori_motoharu'],
    scenarioIds: ['1350'],
    setClanId: 'mori',
    setDefaultProv: 'aki',
    setAssignedProv: 'aki',
    setDaimyo: true
  },
  {
    id: 'yamana_ujiie_bingo_1350',
    officerIds: ['off_yamana_ujiie'],
    scenarioIds: ['1350'],
    setClanId: 'yamana',
    setDefaultProv: 'bingo',
    setAssignedProv: 'bingo',
    setDaimyo: false
  },
  {
    id: 'wada_masato_kii_1350',
    officerIds: ['off_wada_masato'],
    scenarioIds: ['1350'],
    setClanId: 'kusunoki',
    setDefaultProv: 'kii',
    setAssignedProv: 'kii',
    setDaimyo: false
  },
  // 1333 Updates
  {
    id: 'hosokawa_kazuuji_awa_1333',
    officerIds: ['off_dm_hosokawa_1331'],
    scenarioIds: ['1333'],
    setClanId: 'hosokawa',
    setDefaultProv: 'awa_shikoku',
    setAssignedProv: 'awa_shikoku',
    setDaimyo: true
  },
  {
    id: 'sho_suketsuna_bicchu_1333',
    officerIds: ['off_jd_418'],
    scenarioIds: ['1333'],
    setClanId: 'akamatsu',
    setDefaultProv: 'bicchu',
    setAssignedProv: 'bicchu',
    setDaimyo: false
  },
  {
    id: 'uesugi_shigenori_yamashiro_1333',
    officerIds: ['off_uesugi_shigenori'],
    scenarioIds: ['1333'],
    setClanId: 'godaiho',
    setDefaultProv: 'yamashiro',
    setAssignedProv: 'yamashiro',
    setDaimyo: false
  },
  {
    id: 'shiba_ienaga_rikuchu_1333',
    officerIds: ['off_shiba_ienaga'],
    scenarioIds: ['1333'],
    setClanId: 'shiba',
    setDefaultProv: 'rikuchu',
    setAssignedProv: 'rikuchu',
    setDaimyo: false
  },
  {
    id: 'nanbu_officers_mutsu_1333',
    officerIds: ['off_dm_nanbu_1331', 'off_nanbu_masanaga', 'off_succ2_nanbu_1285', 'off_nanbu_masamitsu'],
    scenarioIds: ['1333'],
    setClanId: 'nanbu',
    setDefaultProv: 'mutsu',
    setAssignedProv: 'mutsu',
    setDaimyo: false
  },
  {
    id: 'imagawa_norikuni_suruga_1333',
    officerIds: ['off_succ_imagawa_1304_41'],
    scenarioIds: ['1333'],
    setClanId: 'imagawa',
    setDefaultProv: 'suruga',
    setAssignedProv: 'suruga',
    setDaimyo: true
  },
  {
    id: 'shiba_takatsune_echizen_1333',
    officerIds: ['off_shiba_takatsune'],
    scenarioIds: ['1333'],
    setClanId: 'shiba',
    setDefaultProv: 'echizen',
    setAssignedProv: 'echizen',
    setDaimyo: true
  },
  {
    id: 'ashikaga_tadayoshi_sagami_1333',
    officerIds: ['off_ashikaga_tadayoshi'],
    scenarioIds: ['1333'],
    setClanId: 'ashikaga',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },
  {
    id: 'toki_yorisada_mino_1333',
    officerIds: ['off_toki_yorisada'],
    scenarioIds: ['1333'],
    setClanId: 'toki',
    setDefaultProv: 'mino',
    setAssignedProv: 'mino',
    setDaimyo: true
  },
  {
    id: 'gofushimi_in_yamashiro_1333',
    officerIds: ['off_gofushimi_in'],
    scenarioIds: ['1333'],
    setClanId: 'godaiho',
    setDefaultProv: 'yamashiro',
    setAssignedProv: 'yamashiro',
    setDaimyo: false
  },
  {
    id: 'shiba_iekane_uzen_1333',
    officerIds: ['off_jd_322'],
    scenarioIds: ['1333'],
    setClanId: 'shiba_uzen',
    setDefaultProv: 'uzen',
    setAssignedProv: 'uzen',
    setDaimyo: true
  },
  {
    id: 'kira_sadaie_mikawa_1333',
    officerIds: ['off_jd_213'],
    scenarioIds: ['1333'],
    setClanId: 'ashikaga',
    setDefaultProv: 'mikawa',
    setAssignedProv: 'mikawa',
    setDaimyo: false
  },
  {
    id: 'uesugi_noriaki_musashi_1333',
    officerIds: ['off_uesugi_noriaki_first'],
    scenarioIds: ['1333'],
    setClanId: 'ashikaga',
    setDefaultProv: 'musashi',
    setAssignedProv: 'musashi',
    setDaimyo: false
  },
  {
    id: 'miura_tokitaka_sagami_1333',
    officerIds: ['off_miura_tokitaka_kama'],
    scenarioIds: ['1333'],
    setClanId: 'ashikaga',
    setDefaultProv: 'sagami',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'ko_no_moronao_sagami_1333',
    officerIds: ['off_ko_no_moronao'],
    scenarioIds: ['1333'],
    setClanId: 'ashikaga',
    setDefaultProv: 'sagami',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'ko_no_morofuyu_sagami_1333',
    officerIds: ['off_ko_no_morofuyu'],
    scenarioIds: ['1333'],
    setClanId: 'ashikaga',
    setDefaultProv: 'sagami',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'ko_no_moroyasu_sagami_1333',
    officerIds: ['off_ko_no_moroyasu'],
    scenarioIds: ['1333'],
    setClanId: 'ashikaga',
    setDefaultProv: 'sagami',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'yuki_chikatomo_iwaki_1333',
    officerIds: ['off_yuki_chikatomo', 'off_yuki_tomomitsu'],
    scenarioIds: ['1333'],
    setClanId: 'yuki',
    setDefaultProv: 'iwaki',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'kojima_takanori_bizen_1333',
    officerIds: ['off_kojima_takanori'],
    scenarioIds: ['1333'],
    setClanId: 'akamatsu',
    setDefaultProv: 'bizen',
    setAssignedProv: 'bizen',
    setDaimyo: false
  },
  // 1333 Additional Updates
  {
    id: 'kitabatake_chikafusa_ise_1333',
    officerIds: ['off_kitabatake_chikafusa'],
    scenarioIds: ['1333'],
    setClanId: 'kitabatake',
    setDefaultProv: 'ise',
    setAssignedProv: 'ise',
    setDaimyo: true
  },
  {
    id: 'utsunomiya_kintsuna_shimotsuke_1333',
    officerIds: ['off_utsunomiya_kintsuna'],
    scenarioIds: ['1333'],
    setClanId: 'utsunomiya',
    setDefaultProv: 'shimotsuke',
    setAssignedProv: 'shimotsuke',
    setDaimyo: true
  },
  {
    id: 'yuki_munehiro_iwaki_1333',
    officerIds: ['off_yuki_munehiro'],
    scenarioIds: ['1331', '1333'],
    setClanId: 'yuki',
    setDefaultProv: 'iwaki',
    setAssignedProv: 'iwaki',
    setDaimyo: true
  },

  {
    id: 'anekoji_ietsuna_hida_1333',
    officerIds: ['off_jd_224'],
    scenarioIds: ['1333'],
    setClanId: 'anekoji',
    setDefaultProv: 'hida',
    setAssignedProv: 'hida',
    setDaimyo: true
  },
  {
    id: 'yamana_ujiie_bingo_1333',
    officerIds: ['off_yamana_ujiie'],
    scenarioIds: ['1333'],
    setClanId: 'yamana',
    setDefaultProv: 'bingo',
    setAssignedProv: 'bingo',
    setDaimyo: false
  },
  // 1336 Scenario Updates
  {
    id: 'uesugi_shigenori_yamashiro_1336',
    officerIds: ['off_uesugi_shigenori'],
    scenarioIds: ['1336'],
    setClanId: 'ashikaga',
    setDefaultProv: 'yamashiro',
    setAssignedProv: 'yamashiro',
    setDaimyo: false
  },
  {
    id: 'yamana_ujiie_bingo_1336',
    officerIds: ['off_yamana_ujiie'],
    scenarioIds: ['1336'],
    setClanId: 'yamana',
    setDefaultProv: 'bingo',
    setAssignedProv: 'bingo',
    setDaimyo: false
  },
  {
    id: 'toki_yorisada_mino_1336',
    officerIds: ['off_toki_yorisada'],
    scenarioIds: ['1336'],
    setClanId: 'toki',
    setDefaultProv: 'mino',
    setAssignedProv: 'mino',
    setDaimyo: true
  },
  {
    id: 'toki_yorikasu_mino_1336',
    officerIds: ['off_toki_yorikasu'],
    scenarioIds: ['1336'],
    setClanId: 'toki',
    setDefaultProv: 'mino',
    setAssignedProv: 'mino',
    setDaimyo: false
  },
  {
    id: 'togashi_takaie_kaga_1336',
    officerIds: ['off_dm_togashi_1333'],
    scenarioIds: ['1336'],
    setClanId: 'togashi',
    setDefaultProv: 'kaga',
    setAssignedProv: 'kaga',
    setDaimyo: true
  },
  {
    id: 'isshiki_norouji_tango_1336',
    officerIds: ['off_isshiki_norouji'],
    scenarioIds: ['1336'],
    setClanId: 'isshiki',
    setDefaultProv: 'tango',
    setAssignedProv: 'tango',
    setDaimyo: true
  },
  {
    id: 'ashina_naomori_iwashiro_1336',
    officerIds: ['off_ashina_naomori'],
    scenarioIds: ['1336'],
    setClanId: 'ashina',
    setDefaultProv: 'iwashiro',
    setAssignedProv: 'iwashiro',
    setDaimyo: true
  },
  {
    id: 'yuki_munehiro_iwaki_1336',
    officerIds: ['off_yuki_munehiro'],
    scenarioIds: ['1336'],
    setClanId: 'yuki',
    setDefaultProv: 'iwaki',
    setAssignedProv: 'iwaki',
    setDaimyo: true
  },
  {
    id: 'kasai_kiyosada_ronin_1350',
    officerIds: ['off_dm_kasai_1331'],
    scenarioIds: ['1350'],
    setClanId: 'ronin',
    setDefaultProv: 'rikuchu',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'shiba_iekane_uzen_1350',
    officerIds: ['off_jd_322'],
    scenarioIds: ['1350'],
    setClanId: 'shiba_uzen',
    setDefaultProv: 'uzen',
    setAssignedProv: 'uzen',
    setDaimyo: true
  },
  {
    id: 'nanbu_officers_mutsu_1350',
    officerIds: ['off_dm_nanbu_1331', 'off_nanbu_masanaga', 'off_jd_241'],
    scenarioIds: ['1350'],
    setClanId: 'kitabatake',
    setDefaultProv: 'mutsu',
    setAssignedProv: 'mutsu',
    setDaimyo: false
  },
  {
    id: 'nanbu_nobumitsu_mutsu_1350',
    officerIds: ['off_nanbu_nobumitsu'],
    scenarioIds: ['1350'],
    setClanId: 'kitabatake',
    setDefaultProv: 'mutsu',
    setAssignedProv: 'mutsu',
    setDaimyo: false
  },
  {
    id: 'nagai_hirohide_uzen_1350',
    officerIds: ['off_jd_227'],
    scenarioIds: ['1350'],
    setClanId: 'shiba_uzen',
    setDefaultProv: 'uzen',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'ogasawara_naganori_south_shinano_1350',
    officerIds: ['off_ogasawara_naganori'],
    scenarioIds: ['1350'],
    setClanId: 'ogasawara',
    setDefaultProv: 'south_shinano',
    setAssignedProv: 'south_shinano',
    setDaimyo: true
  },
  {
    id: 'hojo_tokiyuki_south_shinano_1350',
    officerIds: ['off_hojo_tokiyuki'],
    scenarioIds: ['1350'],
    setClanId: 'ogasawara',
    setDefaultProv: 'south_shinano',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'murakami_nobusada_north_shinano_1350',
    officerIds: ['off_murakami_nobusada'],
    scenarioIds: ['1350'],
    setClanId: 'murakami',
    setDefaultProv: 'north_shinano',
    setAssignedProv: 'north_shinano',
    setDaimyo: true
  },
  {
    id: 'murakami_kunikiyo_north_shinano_1350',
    officerIds: ['off_succ_murakami_1300_98'],
    scenarioIds: ['1350'],
    setClanId: 'murakami',
    setDefaultProv: 'north_shinano',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'miura_officers_sagami_1350',
    officerIds: ['off_miura_takatsugu', 'off_miura_tokitaka_kama'],
    scenarioIds: ['1350'],
    setClanId: 'kamakura_fu',
    setDefaultProv: 'sagami',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'ashikaga_tadayoshi_sagami_1350',
    officerIds: ['off_ashikaga_tadayoshi'],
    scenarioIds: ['1350'],
    setClanId: 'ashikaga',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },
  {
    id: 'uesugi_noriaki_musashi_1350',
    officerIds: ['off_uesugi_noriaki_first'],
    scenarioIds: ['1350'],
    setClanId: 'ashikaga',
    setDefaultProv: 'musashi',
    setAssignedProv: 'musashi',
    setDaimyo: false
  },
  {
    id: 'satomi_yoshitane_awa_1350',
    officerIds: ['off_satomi_yoshitane'],
    scenarioIds: ['1350'],
    setClanId: 'satomi',
    setDefaultProv: 'awa_boshu',
    setAssignedProv: 'awa_boshu',
    setDaimyo: true
  },
  {
    id: 'utsunomiya_ujitsuna_sagami_1350',
    officerIds: ['off_utsunomiya_ujitsuna'],
    scenarioIds: ['1350'],
    setClanId: 'kamakura_fu',
    setDefaultProv: 'sagami',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'ko_no_morofuyu_yamashiro_1350',
    officerIds: ['off_ko_no_morofuyu'],
    scenarioIds: ['1350'],
    setClanId: 'ashikaga',
    setDefaultProv: 'yamashiro',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'ko_no_moronao_yamashiro_1350',
    officerIds: ['off_ko_no_moronao'],
    scenarioIds: ['1350'],
    setClanId: 'ashikaga',
    setDefaultProv: 'yamashiro',
    setAssignedProv: 'yamashiro',
    setDaimyo: false
  },
  {
    id: 'enyo_sadakiyo_izumo_1350',
    officerIds: ['off_enyo_sadakiyo'],
    scenarioIds: ['1350'],
    setClanId: 'kyogoku',
    setDefaultProv: 'izumo',
    setAssignedProv: 'izumo',
    setDaimyo: false
  },
  {
    id: 'shimazu_sadahisa_satsuma_1350',
    officerIds: ['off_shimazu_sadahisa'],
    scenarioIds: ['1350'],
    setClanId: 'shimazu',
    setDefaultProv: 'satsuma',
    setAssignedProv: 'satsuma',
    setDaimyo: true
  },
  {
    id: 'hosokawa_akiuji_awa_1350',
    officerIds: ['off_dm_hosokawa_1350'],
    scenarioIds: ['1350'],
    setClanId: 'hosokawa',
    setDefaultProv: 'awa_shikoku',
    setAssignedProv: 'awa_shikoku',
    setDaimyo: true
  },
  {
    id: 'shoni_chikuzen_1350',
    officerIds: ['off_dm_shoni_1336'],
    scenarioIds: ['1350'],
    setClanId: 'shoni',
    setDefaultProv: 'chikuzen',
    setAssignedProv: 'chikuzen',
    setDaimyo: true
  },
  {
    id: 'utsunomiya_fuyutsuna_buzen_1350',
    officerIds: ['off_jd_233'],
    scenarioIds: ['1350'],
    setClanId: 'utsunomiya',
    setDefaultProv: 'buzen',
    setAssignedProv: 'buzen',
    setDaimyo: true
  },
  {
    id: 'nawa_yoshitaka_hoki_1350',
    officerIds: ['off_nawa_yoshitaka'],
    scenarioIds: ['1350'],
    setClanId: 'nawa',
    setDefaultProv: 'hoki',
    setAssignedProv: 'hoki',
    setDaimyo: true
  },
  {
    id: 'kitabatake_akinobu_mutsu_1350',
    officerIds: ['off_kitabatake_akinobu'],
    scenarioIds: ['1350'],
    setClanId: 'kitabatake',
    setDefaultProv: 'mutsu',
    setAssignedProv: 'mutsu',
    setDaimyo: false
  },
  {
    id: 'kitabatake_sadasue_tsugaru_1350',
    officerIds: ['off_jd_363'],
    scenarioIds: ['1350'],
    setClanId: 'kitabatake',
    setDefaultProv: 'tsugaru',
    setAssignedProv: 'tsugaru',
    setDaimyo: false
  },
  {
    id: 'shiba_iekane_uzen_1336',
    officerIds: ['off_jd_322'],
    scenarioIds: ['1336'],
    setClanId: 'shiba_uzen',
    setDefaultProv: 'uzen',
    setAssignedProv: 'uzen',
    setDaimyo: true
  },
  {
    id: 'kitabatake_chikafusa_yamato_1336',
    officerIds: ['off_kitabatake_chikafusa'],
    scenarioIds: ['1336'],
    setClanId: 'kitabatake',
    setDefaultProv: 'yamato',
    setAssignedProv: 'yamato',
    setDaimyo: true
  },
  {
    id: 'onodera_tsunemichi_ugo_1336',
    officerIds: ['off_jd_323'],
    scenarioIds: ['1336'],
    setClanId: 'onodera',
    setDefaultProv: 'ugo',
    setAssignedProv: 'ugo',
    setDaimyo: true
  },
  {
    id: 'kitabatake_akiie_mutsu_1336',
    officerIds: ['off_kitabatake_akiie'],
    scenarioIds: ['1336'],
    setClanId: 'kitabatake',
    setDefaultProv: 'mutsu',
    setAssignedProv: 'mutsu',
    setDaimyo: false
  },
  {
    id: 'nanbu_officers_mutsu_1336',
    officerIds: ['off_dm_nanbu_1331', 'off_nanbu_masanaga', 'off_nanbu_nobumitsu', 'off_succ2_nanbu_1285', 'off_jd_241', 'off_succ2_nanbu_1345'],
    scenarioIds: ['1336'],
    setClanId: 'kitabatake',
    setDefaultProv: 'mutsu',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'kasai_kiyosada_ronin_1336',
    officerIds: ['off_dm_kasai_1331'],
    scenarioIds: ['1336'],
    setClanId: 'ronin',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'anekoji_ietsuna_hida_1336',
    officerIds: ['off_jd_224'],
    scenarioIds: ['1336'],
    setClanId: 'anekoji',
    setDefaultProv: 'hida',
    setAssignedProv: 'hida',
    setDaimyo: true
  },
  {
    id: 'ashikaga_tadayoshi_sagami_1336',
    officerIds: ['off_ashikaga_tadayoshi'],
    scenarioIds: ['1336'],
    setClanId: 'ashikaga',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },
  {
    id: 'ashikaga_motouji_sagami_1336',
    officerIds: ['off_dm_kamakura_fu_1350'],
    scenarioIds: ['1336'],
    setClanId: 'ashikaga',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },
  {
    id: 'miura_tokitaka_sagami_1336',
    officerIds: ['off_miura_tokitaka_kama'],
    scenarioIds: ['1336'],
    setClanId: 'ashikaga',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },
  {
    id: 'satomi_yoshitane_awa_1336',
    officerIds: ['off_satomi_yoshitane'],
    scenarioIds: ['1336'],
    setClanId: 'ashikaga',
    setDefaultProv: 'awa_boshu',
    setAssignedProv: 'awa_boshu',
    setDaimyo: false
  },
  {
    id: 'utsunomiya_clan_awa_1336',
    officerIds: ['off_utsunomiya_kintsuna', 'off_utsunomiya_ujitsuna', 'off_jd_236'],
    scenarioIds: ['1336'],
    setClanId: 'ashikaga',
    setDefaultProv: 'awa_boshu',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'doi_michimasu_iyo_1336',
    officerIds: ['off_doi_michimasu'],
    scenarioIds: ['1336'],
    setClanId: 'kono',
    setDefaultProv: 'iyo',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'ko_no_morofuyu_sagami_1336',
    officerIds: ['off_ko_no_morofuyu'],
    scenarioIds: ['1336'],
    setClanId: 'ashikaga',
    setDefaultProv: 'sagami',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'ko_no_moronao_yamashiro_1336',
    officerIds: ['off_ko_no_moronao'],
    scenarioIds: ['1336'],
    setClanId: 'ashikaga',
    setDefaultProv: 'yamashiro',
    setAssignedProv: 'yamashiro',
    setDaimyo: false
  },
  {
    id: 'ko_no_moroyasu_sagami_1336',
    officerIds: ['off_ko_no_moroyasu'],
    scenarioIds: ['1336'],
    setClanId: 'ashikaga',
    setDefaultProv: 'sagami',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'yuki_chikatomo_iwaki_1336',
    officerIds: ['off_yuki_chikatomo'],
    scenarioIds: ['1336'],
    setClanId: 'yuki',
    setDefaultProv: 'iwaki',
    clearAssignment: true,
    setDaimyo: false
  },

  {
    id: 'shiba_ienaga_rikuchu_1336',
    officerIds: ['off_shiba_ienaga'],
    scenarioIds: ['1336'],
    setClanId: 'shiba_uzen',
    setDefaultProv: 'rikuchu',
    setAssignedProv: 'rikuchu',
    setDaimyo: false
  },
  {
    id: 'shiba_iekane_uzen_1331',
    officerIds: ['off_jd_322'],
    scenarioIds: ['1331'],
    setClanId: 'shiba_uzen',
    setDefaultProv: 'uzen',
    setAssignedProv: 'uzen',
    setDaimyo: true
  },
  {
    id: 'shiba_ienaga_rikuchu_1331',
    officerIds: ['off_shiba_ienaga'],
    scenarioIds: ['1331'],
    setClanId: 'shiba',
    setDefaultProv: 'rikuchu',
    setAssignedProv: 'rikuchu',
    setDaimyo: false
  },
  {
    id: 'shiba_takatsune_echizen_1331',
    officerIds: ['off_shiba_takatsune'],
    scenarioIds: ['1331'],
    setClanId: 'shiba',
    setDefaultProv: 'echizen',
    setAssignedProv: 'echizen',
    setDaimyo: true
  },
  {
    id: 'kasai_kiyosada_rikuchu_1331',
    officerIds: ['off_dm_kasai_1331'],
    scenarioIds: ['1331'],
    setClanId: 'shiba',
    setDefaultProv: 'rikuchu',
    setAssignedProv: 'rikuchu',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'ogasawara_sadamune_south_shinano_1331',
    officerIds: ['off_ogasawara_sadamune'],
    scenarioIds: ['1331'],
    setClanId: 'ogasawara',
    setDefaultProv: 'south_shinano',
    setAssignedProv: 'south_shinano',
    setDaimyo: true
  },
  {
    id: 'ogasawara_nagauji_south_shinano_1331',
    officerIds: ['off_succ_ogasawara_1275_111'],
    scenarioIds: ['1331'],
    setClanId: 'ogasawara',
    setDefaultProv: 'south_shinano',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'murakami_kunikiyo_north_shinano_1331',
    officerIds: ['off_succ_murakami_1300_98'],
    scenarioIds: ['1331'],
    setClanId: 'murakami',
    setDefaultProv: 'north_shinano',
    setAssignedProv: 'north_shinano',
    setDaimyo: true
  },
  {
    id: 'chigusa_tadaaki_yamato_1331',
    officerIds: ['off_chigusa_tadaaki'],
    scenarioIds: ['1331'],
    setClanId: 'godaiho',
    setDefaultProv: 'yamato',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'ashikaga_sadauji_ashikaga_1331',
    officerIds: ['off_ashikaga_sadauji'],
    scenarioIds: ['1331'],
    setClanId: 'ashikaga',
    setDefaultProv: 'shimotsuke',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'kitabatake_akiie_mutsu_1331',
    officerIds: ['off_kitabatake_akiie'],
    scenarioIds: ['1331'],
    setClanId: 'kitabatake',
    setDefaultProv: 'mutsu',
    setAssignedProv: 'mutsu',
    setDaimyo: false
  },
  {
    id: 'nanbu_officers_mutsu_1331',
    officerIds: ['off_dm_nanbu_1331', 'off_nanbu_masanaga', 'off_succ2_nanbu_1285', 'off_nanbu_masamitsu'],
    scenarioIds: ['1331'],
    setClanId: 'kitabatake',
    setDefaultProv: 'mutsu',
    setAssignedProv: 'mutsu',
    setDaimyo: false
  },
  {
    id: 'gofushimi_in_yamashiro_1331',
    officerIds: ['off_gofushimi_in'],
    scenarioIds: ['1331'],
    setDefaultProv: 'yamashiro',
    setAssignedProv: 'yamashiro',
    setDaimyo: false
  },
  {
    id: 'togashi_hojo_1331',
    officerIds: ['off_dm_togashi_1333', 'off_togashi_ujiharu'],
    scenarioIds: ['1331'],
    setClanId: 'hojo_kamakura',
    setDefaultProv: 'kaga',
    setAssignedProv: 'kaga',
    setDaimyo: false
  },
  {
    id: 'jo_nitta_1331',
    officerIds: ['off_jo_sukemitsu'],
    scenarioIds: ['1331'],
    setClanId: 'nitta',
    setDefaultProv: 'echigo',
    setAssignedProv: 'echigo',
    setDaimyo: false
  },
  {
    id: 'uesugi_noriaki_musashi_1336',
    officerIds: ['off_uesugi_noriaki_first'],
    scenarioIds: ['1336'],
    setClanId: 'ashikaga',
    setDefaultProv: 'musashi',
    setAssignedProv: 'musashi',
    setDaimyo: false
  },
  // 1359 Scenario Updates
  {
    id: 'kasai_kiyosada_rikuchu_1359',
    officerIds: ['off_dm_kasai_1331'],
    scenarioIds: ['1359'],
    setClanId: 'kasai',
    setDefaultProv: 'rikuchu',
    setAssignedProv: 'rikuchu',
    setDaimyo: true
  },
  {
    id: 'kasai_mitsusada_rikuchu_1359',
    officerIds: ['off_kasai_mitsusada'],
    scenarioIds: ['1359'],
    setClanId: 'kasai',
    setDefaultProv: 'rikuchu',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'miura_officers_sagami_1359',
    officerIds: ['off_miura_takatsugu', 'off_miura_tokitaka_kama'],
    scenarioIds: ['1359'],
    setClanId: 'kamakura_fu',
    setDefaultProv: 'sagami',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'shiba_takatsune_echizen_1359',
    officerIds: ['off_shiba_takatsune'],
    scenarioIds: ['1359'],
    setClanId: 'shiba',
    setDefaultProv: 'echizen',
    setAssignedProv: 'echizen',
    setDaimyo: true
  },
  {
    id: 'utsunomiya_ujitsuna_awa_1359',
    officerIds: ['off_utsunomiya_ujitsuna'],
    scenarioIds: ['1359'],
    setClanId: 'satomi',
    setDefaultProv: 'awa_boshu',
    clearAssignment: true,
    setDaimyo: false
  },
  {
    id: 'shoni_fuyusuke_chikuzen_1359',
    officerIds: ['off_shoni_fuyusuke'],
    scenarioIds: ['1359'],
    setClanId: 'shoni',
    setDefaultProv: 'chikuzen',
    clearAssignment: true,
    setDaimyo: false
  },
  {
    id: 'munakata_ujinori_chikuzen_1359',
    officerIds: ['off_jd_365'],
    scenarioIds: ['1359'],
    setClanId: 'shoni',
    setDefaultProv: 'chikuzen',
    clearAssignment: true,
    setDaimyo: false
  },
  {
    id: 'hosokawa_akiuji_sanuki_1359',
    officerIds: ['off_dm_hosokawa_1350'],
    scenarioIds: ['1359'],
    setClanId: 'hosokawa',
    setDefaultProv: 'sanuki',
    clearAssignment: true,
    setDaimyo: false
  },
  {
    id: 'nawa_yoshitaka_hoki_1359',
    officerIds: ['off_nawa_yoshitaka'],
    scenarioIds: ['1359'],
    setClanId: 'nawa',
    setDefaultProv: 'hoki',
    setAssignedProv: 'hoki',
    setDaimyo: true
  },
  // 1391 Scenario Updates
  {
    id: 'miura_takatsugu_sagami_1391',
    officerIds: ['off_miura_takatsugu'],
    scenarioIds: ['1391'],
    setClanId: 'kamakura_fu',
    setDefaultProv: 'sagami',
    clearAssignment: true,
    setDaimyo: false
  },
  {
    id: 'utsunomiya_ujitsuna_awa_1391',
    officerIds: ['off_utsunomiya_ujitsuna'],
    scenarioIds: ['1391'],
    setClanId: 'satomi',
    setDefaultProv: 'awa_boshu',
    clearAssignment: true,
    setDaimyo: false
  },
  {
    id: 'shoni_fuyusuke_hizen_1391',
    officerIds: ['off_shoni_fuyusuke'],
    scenarioIds: ['1391'],
    setClanId: 'shoni',
    setDefaultProv: 'hizen',
    clearAssignment: true,
    setDaimyo: false
  },
  {
    id: 'munakata_ujinori_chikuzen_1391',
    officerIds: ['off_jd_365'],
    scenarioIds: ['1391'],
    setClanId: 'ashikaga',
    setDefaultProv: 'chikuzen',
    clearAssignment: true,
    setDaimyo: false
  },
  {
    id: 'hosokawa_akiuji_sanuki_1391',
    officerIds: ['off_dm_hosokawa_1350'],
    scenarioIds: ['1391'],
    setClanId: 'hosokawa',
    setDefaultProv: 'sanuki',
    clearAssignment: true,
    setDaimyo: false
  },
  {
    id: 'nawa_yoshitaka_hoki_1391',
    officerIds: ['off_nawa_yoshitaka'],
    scenarioIds: ['1391'],
    setClanId: 'nawa',
    setDefaultProv: 'hoki',
    setAssignedProv: 'hoki',
    setDaimyo: true
  },
  {
    id: 'nawa_officers_higo_1391',
    officerIds: ['off_nawa_akioki', 'off_nawa_norinaga'],
    scenarioIds: ['1391'],
    setClanId: 'kikuchi',
    setDefaultProv: 'higo',
    clearAssignment: true,
    setDaimyo: false
  },
  // 1400 Scenario Updates
  {
    id: 'nanbu_nobunaga_mutsu_1400',
    officerIds: ['off_nanbu_nobunaga'],
    scenarioIds: ['1400'],
    setClanId: 'nanbu',
    setDefaultProv: 'mutsu',
    clearAssignment: true,
    setDaimyo: false
  },
  {
    id: 'kasai_mitsusada_rikuchu_1400',
    officerIds: ['off_kasai_mitsusada'],
    scenarioIds: ['1400'],
    setClanId: 'kasai',
    setDefaultProv: 'rikuchu',
    setAssignedProv: 'rikuchu',
    setDaimyo: true
  },
  {
    id: 'kasai_officers_rikuchu_1400',
    officerIds: ['off_kasai_munekiyo', 'off_kasai_mojisada'],
    scenarioIds: ['1400'],
    setClanId: 'kasai',
    setDefaultProv: 'rikuchu',
    clearAssignment: true,
    setDaimyo: false
  },
  {
    id: 'ashikaga_mitsusada_sagami_1400',
    officerIds: ['off_succ2_kamakura_fu_1380'],
    scenarioIds: ['1400'],
    setClanId: 'kamakura_fu',
    setDefaultProv: 'sagami',
    clearAssignment: true,
    setDaimyo: false
  },
  {
    id: 'imagawa_sadayo_chikuzen_1400',
    officerIds: ['off_imagawa_sadayo'],
    scenarioIds: ['1400'],
    setClanId: 'ashikaga',
    setDefaultProv: 'chikuzen',
    setAssignedProv: 'chikuzen',
    setDaimyo: false
  },
  {
    id: 'shoni_officers_hizen_1400',
    officerIds: ['off_shoni_mitsusada', 'off_succ_shoni_1360_164'],
    scenarioIds: ['1400'],
    setClanId: 'shoni',
    setDefaultProv: 'hizen',
    clearAssignment: true,
    setDaimyo: false
  },
  {
    id: 'toki_yasuyuki_mino_1400',
    officerIds: ['off_toki_yasuyuki'],
    scenarioIds: ['1400'],
    setClanId: 'toki',
    setDefaultProv: 'mino',
    clearAssignment: true,
    setDaimyo: false
  },
  {
    id: 'asakura_norikage_echizen_1400',
    officerIds: ['off_asakura_norikage'],
    scenarioIds: ['1400'],
    setClanId: 'shiba',
    setDefaultProv: 'echizen',
    clearAssignment: true,
    setDaimyo: false
  },
  {
    id: 'nawa_officers_higo_1400',
    officerIds: ['off_nawa_yoshitaka', 'off_nawa_akioki', 'off_nawa_norinaga'],
    scenarioIds: ['1400'],
    setClanId: 'kikuchi',
    setDefaultProv: 'higo',
    clearAssignment: true,
    setDaimyo: false
  },
  // 1438 Scenario Updates
  {
    id: 'kasai_munekiyo_rikuchu_1438',
    officerIds: ['off_kasai_munekiyo'],
    scenarioIds: ['1438'],
    setClanId: 'kasai',
    setDefaultProv: 'rikuchu',
    setAssignedProv: 'rikuchu',
    setDaimyo: true
  },
  {
    id: 'ashikaga_mitsusada_sagami_1438',
    officerIds: ['off_succ2_kamakura_fu_1380'],
    scenarioIds: ['1438'],
    setClanId: 'kamakura_fu',
    setDefaultProv: 'sagami',
    clearAssignment: true,
    setDaimyo: false
  },
  {
    id: 'shiba_yoshitoshi_owari_1438',
    officerIds: ['off_succ_shiba_1390_156'],
    scenarioIds: ['1438'],
    setClanId: 'shiba',
    setDefaultProv: 'owari',
    clearAssignment: true,
    setDaimyo: false
  },
  {
    id: 'sugi_shigeaki_chikuzen_1438',
    officerIds: ['off_ouchi_sugi_shigeaki'],
    scenarioIds: ['1438'],
    setClanId: 'ouchi',
    setDefaultProv: 'chikuzen',
    clearAssignment: true,
    setDaimyo: false
  },
  {
    id: 'otomo_chikaaki_bungo_1438',
    officerIds: ['off_succ2_otomo_1390'],
    scenarioIds: ['1438'],
    setClanId: 'otomo',
    setDefaultProv: 'bungo',
    clearAssignment: true,
    setDaimyo: false
  },
  // 1467 Scenario Updates
  {
    // 山内上杉家の家宰として上野の城代を務める（太田道灌は扇谷上杉家・武蔵）
    id: 'nagao_kagenobu_kozuke_1467',
    officerIds: ['off_nagao_kagenobu'],
    scenarioIds: ['1467'],
    setClanId: 'uesugi',
    setDefaultProv: 'kozuke',
    setAssignedProv: 'kozuke',
    setDaimyo: false
  },
  {
    id: 'nagao_yoshikage_echigo_1467',
    officerIds: ['off_nagao_yoshikage'],
    scenarioIds: ['1467'],
    setClanId: 'uesugi',
    setDefaultProv: 'echigo',
    clearAssignment: true,
    setDaimyo: false
  },
  {
    id: 'ogigayatsu_officers_musashi_1467',
    officerIds: ['off_uesugi_mochitomo'],
    scenarioIds: ['1467'],
    setClanId: 'ogigayatsu',
    setDefaultProv: 'musashi',
    setAssignedProv: 'musashi',
    setDaimyo: true
  },
  {
    id: 'ogigayatsu_retainers_musashi_1467',
    officerIds: ['off_uesugi_masakage_1467', 'off_ota_dokan'],
    scenarioIds: ['1467'],
    setClanId: 'ogigayatsu',
    setDefaultProv: 'musashi',
    clearAssignment: true,
    setDaimyo: false
  },
  {
    id: 'uesugi_fusasada_echigo_1467',
    officerIds: ['off_uesugi_fusasada'],
    scenarioIds: ['1467'],
    setClanId: 'uesugi',
    setDefaultProv: 'echigo',
    setAssignedProv: 'echigo',
    setDaimyo: false
  },
  {
    id: 'takeda_nobunaga_kazusa_1467',
    officerIds: ['off_jd_369'],
    scenarioIds: ['1467'],
    setClanId: 'takeda_kazusa',
    setDefaultProv: 'kazusa',
    setAssignedProv: 'kazusa',
    setDaimyo: true
  },
  {
    id: 'hara_tanehusa_shimousa_1467',
    officerIds: ['off_jd_006'],
    scenarioIds: ['1467'],
    setClanId: 'chiba',
    setDefaultProv: 'shimousa',
    clearAssignment: true,
    setDaimyo: false
  },
  {
    id: 'shiba_yoshikado_owari_1467',
    officerIds: ['off_dm_shiba_1467'],
    scenarioIds: ['1467'],
    setClanId: 'shiba',
    setDefaultProv: 'owari',
    setAssignedProv: 'owari',
    setDaimyo: true
  },
  {
    id: 'oda_toshihiro_owari_1467',
    officerIds: ['off_oda_toshihiro'],
    scenarioIds: ['1467'],
    setClanId: 'shiba',
    setDefaultProv: 'owari',
    clearAssignment: true,
    setDaimyo: false
  },
  {
    id: 'nawa_officers_higo_1467',
    officerIds: ['off_nawa_shigeyuki', 'off_nawa_akitada', 'off_nawa_norinaga'],
    scenarioIds: ['1467'],
    setClanId: 'kikuchi',
    setDefaultProv: 'higo',
    clearAssignment: true,
    setDaimyo: false
  },
  {
    id: 'yamana_koretoyo_bingo_1467',
    officerIds: ['off_yamana_koretoyo'],
    scenarioIds: ['1467'],
    setClanId: 'yamana',
    setDefaultProv: 'bingo',
    setAssignedProv: 'bingo',
    setDaimyo: false
  },
  {
    id: 'masuda_sadakane_iwami_1467',
    officerIds: ['off_masuda_sadakane'],
    scenarioIds: ['1467'],
    setClanId: 'ouchi',
    setDefaultProv: 'iwami',
    setAssignedProv: 'iwami',
    setDaimyo: false
  },
  {
    id: 'namioka_akiyasu_tsugaru_1467',
    officerIds: ['off_nanbu_namioka_akiyasu'],
    scenarioIds: ['1467'],
    setClanId: 'namioka',
    setDefaultProv: 'tsugaru',
    setAssignedProv: 'tsugaru',
    setDaimyo: true
  },
  {
    id: 'hojo_tokikane_sagami_1467',
    officerIds: ['off_hojo_tokikane'],
    scenarioIds: ['1467'],
    setClanId: 'ogigayatsu',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },
  // 1495 Scenario Updates
  {
    id: 'shiba_yoshihiro_owari_1495',
    officerIds: ['off_shiba_yoshihiro'],
    scenarioIds: ['1495', '1493'],
    setClanId: 'oda',
    setDefaultProv: 'owari',
    clearAssignment: true,
    setDaimyo: false
  },
  {
    id: 'rokkaku_takayori_south_omi_1495',
    officerIds: ['off_rokkaku_takayori'],
    scenarioIds: ['1495', '1493'],
    setClanId: 'rokkaku',
    setDefaultProv: 'south_omi',
    setAssignedProv: 'south_omi',
    setDaimyo: true
  },
  {
    id: 'yamana_masatoyo_tajima_1495',
    officerIds: ['off_yamana_masatoyo'],
    scenarioIds: ['1495', '1493'],
    setClanId: 'yamana',
    setDefaultProv: 'tajima',
    setAssignedProv: 'tajima',
    setDaimyo: true
  },
  {
    id: 'kyogoku_masatsune_izumo_1495',
    officerIds: ['off_kyogoku_masatsune'],
    scenarioIds: ['1495', '1493'],
    setClanId: 'amago',
    setDefaultProv: 'izumo',
    clearAssignment: true,
    setDaimyo: false
  },
  {
    id: 'uesugi_tomoyoshi_musashi_1495',
    officerIds: ['off_uesugi_tomoyoshi_1495'],
    scenarioIds: ['1495'],
    setClanId: 'ogigayatsu',
    setDefaultProv: 'musashi',
    setAssignedProv: 'musashi',
    setDaimyo: true
  },
  {
    id: 'ota_sukeyasu_musashi_1495',
    officerIds: ['off_ota_sukeyasu'],
    scenarioIds: ['1495', '1493'],
    setClanId: 'ogigayatsu',
    setDefaultProv: 'musashi',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'kasai_hisanobu_rikuchu_1495',
    officerIds: ['off_kasai_hisanobu'],
    scenarioIds: ['1495', '1493'],
    setClanId: 'kasai',
    setDefaultProv: 'rikuchu',
    setAssignedProv: 'rikuchu',
    setDaimyo: true
  },
  {
    id: 'osaki_yoshikane_ronin_1495',
    officerIds: ['off_osaki_yoshikane_1495'],
    scenarioIds: ['1495', '1493'],
    setClanId: 'ronin',
    setDefaultProv: 'rikuchu',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'shiba_akitaka_ronin_1495',
    officerIds: ['off_shiba_akitaka_1495'],
    scenarioIds: ['1495', '1493'],
    setClanId: 'ronin',
    setDefaultProv: 'rikuchu',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'sue_ujihisa_suo_1495',
    officerIds: ['off_sue_ujihisa'],
    scenarioIds: ['1495', '1493'],
    setClanId: 'ouchi',
    setDefaultProv: 'suo',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'nanbu_masayasu_mutsu_1495',
    officerIds: ['off_jd_303'],
    scenarioIds: ['1495', '1493'],
    setClanId: 'nanbu',
    setDefaultProv: 'mutsu',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  // 1531 Scenario Updates
  {
    id: 'kasai_harushige_rikuchu_1531',
    officerIds: ['off_kasai_harushige_1531'],
    scenarioIds: ['1531'],
    setClanId: 'kasai',
    setDefaultProv: 'rikuchu',
    setAssignedProv: 'rikuchu',
    setDaimyo: true
  },
  {
    id: 'ashikaga_yoshiaki_kazusa_1531',
    officerIds: ['off_ashikaga_yoshiaki_oyumi'],
    scenarioIds: ['1531'],
    setClanId: 'ashikaga_oyumi',
    setDefaultProv: 'kazusa',
    setAssignedProv: 'kazusa',
    setDaimyo: true
  },
  {
    id: 'ashikaga_haruuji_shimousa_1531',
    officerIds: ['off_ashikaga_haruuji'],
    scenarioIds: ['1531'],
    setClanId: 'kamakura_fu',
    setDefaultProv: 'shimousa',
    setAssignedProv: 'shimousa',
    setDaimyo: true
  },
  {
    id: 'ashikaga_retainers_shimousa_1531',
    officerIds: ['off_ashikaga_takamoto', 'off_ashikaga_masauji'],
    scenarioIds: ['1531'],
    setClanId: 'kamakura_fu',
    setDefaultProv: 'shimousa',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'chiba_masatane_shimousa_1531',
    officerIds: ['off_chiba_masatane'],
    scenarioIds: ['1531'],
    setClanId: 'kamakura_fu',
    setDefaultProv: 'shimousa',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'uesugi_norimasa_kozuke_1531',
    officerIds: ['off_dm_uesugi_1546'],
    scenarioIds: ['1531'],
    setClanId: 'uesugi',
    setDefaultProv: 'kozuke',
    setAssignedProv: 'kozuke',
    setDaimyo: true
  },
  {
    id: 'ogigayatsu_tomooki_musashi_1531',
    officerIds: ['off_uesugi_tomooki'],
    scenarioIds: ['1531'],
    setClanId: 'ogigayatsu',
    setDefaultProv: 'musashi',
    setAssignedProv: 'musashi',
    setDaimyo: true
  },
  {
    id: 'ando_chikasue_ugo_1531',
    officerIds: ['off_dm_ando_1560'],
    scenarioIds: ['1531'],
    setClanId: 'ando',
    setDefaultProv: 'ugo',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'ota_clan_musashi_1531',
    officerIds: ['off_ota_sukeyori', 'off_ota_suketaka'],
    scenarioIds: ['1531'],
    setClanId: 'ogigayatsu',
    setDefaultProv: 'musashi',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'hara_tanesada_ashikaga_1531',
    officerIds: ['off_hara_tanesada_1546'],
    scenarioIds: ['1531'],
    setClanId: 'kamakura_fu',
    setDefaultProv: 'shimousa',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'takeda_nobutora_kai_1531',
    officerIds: ['off_takeda_nobutora'],
    scenarioIds: ['1531'],
    setClanId: 'takeda',
    setDefaultProv: 'kai',
    setAssignedProv: 'kai',
    setDaimyo: true
  },
  // 1538 Scenario Updates
  {
    id: 'nanbu_harumasa_mutsu_1538',
    officerIds: ['off_nanbu_harumasa'],
    scenarioIds: ['1538'],
    setClanId: 'nanbu',
    setDefaultProv: 'mutsu',
    setAssignedProv: 'mutsu',
    setDaimyo: true
  },
  {
    id: 'nanbu_retainers_mutsu_1538',
    officerIds: ['off_succ2_nanbu_1495', 'off_kita_nobuchika'],
    scenarioIds: ['1538'],
    setClanId: 'nanbu',
    setDefaultProv: 'mutsu',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'kasai_harushige_rikuchu_1538',
    officerIds: ['off_kasai_harushige_1531'],
    scenarioIds: ['1538'],
    setClanId: 'kasai',
    setDefaultProv: 'rikuchu',
    setAssignedProv: 'rikuchu',
    setDaimyo: true
  },
  {
    id: 'osaki_yoshinao_ronin_1538',
    officerIds: ['off_osaki_yoshinao_1538'],
    scenarioIds: ['1538'],
    setClanId: 'ronin',
    setDefaultProv: 'rikuchu',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'shiba_akitaka_ronin_1538',
    officerIds: ['off_shiba_akitaka_1495'],
    scenarioIds: ['1538'],
    setClanId: 'ronin',
    setDefaultProv: 'rikuchu',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'ashikaga_haruuji_shimousa_1538',
    officerIds: ['off_ashikaga_haruuji'],
    scenarioIds: ['1538'],
    setClanId: 'kamakura_fu',
    setDefaultProv: 'shimousa',
    setAssignedProv: 'shimousa',
    setDaimyo: true
  },
  {
    id: 'ashikaga_takamoto_shimousa_1538',
    officerIds: ['off_ashikaga_takamoto'],
    scenarioIds: ['1538'],
    setClanId: 'kamakura_fu',
    setDefaultProv: 'shimousa',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'ashikaga_yoshiaki_kazusa_1538',
    officerIds: ['off_ashikaga_yoshiaki_oyumi'],
    scenarioIds: ['1538'],
    setClanId: 'ashikaga_oyumi',
    setDefaultProv: 'kazusa',
    setAssignedProv: 'kazusa',
    setDaimyo: true
  },
  {
    id: 'masaki_tokishige_awa_1538',
    officerIds: ['off_masaki_tokishige'],
    scenarioIds: ['1538'],
    setClanId: 'satomi',
    setDefaultProv: 'awa_boshu',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  // 1546 Scenario Updates
  {
    id: 'nanbu_harumasa_mutsu_1546',
    officerIds: ['off_nanbu_harumasa'],
    scenarioIds: ['1546'],
    setClanId: 'nanbu',
    setDefaultProv: 'mutsu',
    setAssignedProv: 'mutsu',
    setDaimyo: true
  },
  {
    id: 'nanbu_retainers_mutsu_1546',
    officerIds: ['off_succ2_nanbu_1495', 'off_kita_nobuchika'],
    scenarioIds: ['1546'],
    setClanId: 'nanbu',
    setDefaultProv: 'mutsu',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'kasai_harushige_rikuchu_1546',
    officerIds: ['off_kasai_harushige_1531'],
    scenarioIds: ['1546'],
    setClanId: 'kasai',
    setDefaultProv: 'rikuchu',
    setAssignedProv: 'rikuchu',
    setDaimyo: true
  },
  {
    id: 'osaki_yoshinao_ronin_1546',
    officerIds: ['off_osaki_yoshinao_1538'],
    scenarioIds: ['1546'],
    setClanId: 'ronin',
    setDefaultProv: 'rikuchu',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'shiba_akitaka_ronin_1546',
    officerIds: ['off_shiba_akitaka_1495'],
    scenarioIds: ['1546'],
    setClanId: 'ronin',
    setDefaultProv: 'rikuchu',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'chiba_toshitane_shimousa_1546',
    officerIds: ['off_chiba_toshitane'],
    scenarioIds: ['1546'],
    setClanId: 'chiba',
    setDefaultProv: 'shimousa',
    setAssignedProv: 'shimousa',
    setDaimyo: true
  },
  {
    id: 'chiba_retainers_shimousa_1546',
    officerIds: ['off_chiba_masatane', 'off_hara_tanesada_1546', 'off_jd_307'],
    scenarioIds: ['1546'],
    setClanId: 'chiba',
    setDefaultProv: 'shimousa',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'ashikaga_haruuji_ronin_1546',
    officerIds: ['off_ashikaga_haruuji'],
    scenarioIds: ['1546'],
    setClanId: 'ronin',
    setDefaultProv: 'shimousa',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'uesugi_norimasa_kozuke_1546',
    officerIds: ['off_dm_uesugi_1546'],
    scenarioIds: ['1546'],
    setClanId: 'yamanouchi',
    setDefaultProv: 'kozuke',
    setAssignedProv: 'kozuke',
    setDaimyo: true
  },
  {
    id: 'uesugi_tomosada_musashi_ronin_1546',
    officerIds: ['off_uesugi_tomosada'],
    scenarioIds: ['1546'],
    setClanId: 'ronin',
    setDefaultProv: 'musashi',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },

  // 1555 Scenario Updates
  {
    id: 'chiba_toshitane_shimousa_hojo_1555',
    officerIds: ['off_chiba_toshitane'],
    scenarioIds: ['1555'],
    setClanId: 'hojo',
    setDefaultProv: 'shimousa',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'nanbu_harumasa_mutsu_1555',
    officerIds: ['off_nanbu_harumasa'],
    scenarioIds: ['1555'],
    setClanId: 'nanbu',
    setDefaultProv: 'mutsu',
    setAssignedProv: 'mutsu',
    setDaimyo: true
  },
  {
    id: 'nanbu_retainers_mutsu_1555',
    officerIds: ['off_succ2_nanbu_1495', 'off_kita_nobuchika'],
    scenarioIds: ['1555'],
    setClanId: 'nanbu',
    setDefaultProv: 'mutsu',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'shiba_yoshikane_owari_1555',
    officerIds: ['off_shiba_yoshikane'],
    scenarioIds: ['1555'],
    setClanId: 'ronin',
    setDefaultProv: 'owari',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'uesugi_norimasa_kozuke_1555',
    officerIds: ['off_dm_uesugi_1546'],
    scenarioIds: ['1555'],
    setClanId: 'yamanouchi',
    setDefaultProv: 'kozuke',
    setAssignedProv: 'kozuke',
    setDaimyo: true
  },
  {
    id: 'kuki_kiyotaka_shima_1555',
    officerIds: ['off_kuki_kiyotaka_1555'],
    scenarioIds: ['1555'],
    setClanId: 'kuki',
    setDefaultProv: 'shima',
    setAssignedProv: 'shima',
    setDaimyo: true
  },
  {
    id: 'kunohe_masazane_mutsu_1555',
    officerIds: ['off_kunohe_masazane'],
    scenarioIds: ['1555'],
    setClanId: 'nanbu',
    setDefaultProv: 'mutsu',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'hara_tanesada_hojo_1555',
    officerIds: ['off_hara_tanesada_1546'],
    scenarioIds: ['1555'],
    setClanId: 'hojo',
    setDefaultProv: 'shimousa',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'nagano_narimasa_kozuke_1555',
    officerIds: ['off_nagano_narimasa'],
    scenarioIds: ['1555'],
    setClanId: 'yamanouchi',
    setDefaultProv: 'kozuke',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'maeda_keiji_owari_1555',
    officerIds: ['off_maeda_keiji'],
    scenarioIds: ['1555'],
    setClanId: 'oda',
    setDefaultProv: 'owari',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  // 1560 Scenario Updates
  {
    id: 'kunohe_nanbu_officers_mutsu_1560',
    officerIds: ['off_kunohe_masazane', 'off_kunohe_sanechika', 'off_succ2_nanbu_1495'],
    scenarioIds: ['1560'],
    setClanId: 'nanbu',
    setDefaultProv: 'mutsu',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  // 1570 Scenario Updates: 鈴木重秀（紀伊・雑賀配下）
  {
    id: 'suzuki_shigehide_saika_1570',
    officerIds: ['off_saika_magoichi'],
    scenarioIds: ['1570'],
    setClanId: 'saika',
    setDefaultProv: 'kii',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  // 1582 Scenario Updates: 鈴木重秀（大名）・鈴木重朝（配下）
  {
    id: 'suzuki_shigehide_daimyo_1582',
    officerIds: ['off_saika_magoichi'],
    scenarioIds: ['1582', '1584'],
    setClanId: 'saika',
    setDefaultProv: 'kii',
    setAssignedProv: 'kii',
    setDaimyo: true
  },
  {
    id: 'suzuki_shigetomo_saika_1582',
    officerIds: ['off_suzuki_shigetomo'],
    scenarioIds: ['1582', '1584'],
    setClanId: 'saika',
    setDefaultProv: 'kii',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  // 1584 Scenario Updates: 村上武吉・来島通総（伊予・長宗我部配下）
  {
    id: 'murakami_kurushima_chosokabe_1584',
    officerIds: ['off_murakami_takeyoshi', 'off_kurushima_michifusa'],
    scenarioIds: ['1584'],
    setClanId: 'chosokabe',
    setDefaultProv: 'iyo',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  // 1587 Scenario Updates: 木下勝俊（若狭・浅野長政配下）
  {
    id: 'kinoshita_katsutoshi_asano_1587',
    officerIds: ['off_jd_038'],
    scenarioIds: ['1587'],
    setClanId: 'toyotomi',
    setDefaultProv: 'wakasa',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  // 1587 Scenario Updates: 津軽為信（津軽大名独立）
  {
    id: 'tsugaru_tamenobu_daimyo_1587',
    officerIds: ['off_tsugaru_tamenobu'],
    scenarioIds: ['1587'],
    setClanId: 'tsugaru',
    setDefaultProv: 'tsugaru',
    setAssignedProv: 'tsugaru',
    setDaimyo: true
  },
  // 1590 Scenario Updates: 伊達政宗（岩代・伊達大名）
  {
    id: 'date_masamune_iwashiro_1590',
    officerIds: ['off_date_masamune'],
    scenarioIds: ['1590'],
    setClanId: 'date',
    setDefaultProv: 'iwashiro',
    setAssignedProv: 'iwashiro',
    setDaimyo: true
  },
  // 1592 Scenario Updates:
  // 1. 岩代の伊達成実は陸前に移動
  {
    id: 'date_shigezane_rikuzen_1592',
    officerIds: ['off_date_shigezane'],
    scenarioIds: ['1592'],
    setClanId: 'date',
    setDefaultProv: 'rikuzen',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  // 2. 岩代は蒲生氏郷を大名として独立、配下に蒲生氏家臣
  {
    id: 'gamo_ujisato_iwashiro_1592',
    officerIds: ['off_gamo_ujisato'],
    scenarioIds: ['1592'],
    setClanId: 'gamo',
    setDefaultProv: 'iwashiro',
    setAssignedProv: 'iwashiro',
    setDaimyo: true
  },
  {
    id: 'gamo_retainers_iwashiro_1592',
    officerIds: ['off_gamo_satoyasu', 'off_gamo_satonari', 'off_machino_shigenori'],
    scenarioIds: ['1592'],
    setClanId: 'gamo',
    setDefaultProv: 'iwashiro',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  // 3. 白石宗実を磐城から陸前に移動
  {
    id: 'shiroishi_munezane_rikuzen_1592',
    officerIds: ['off_jd_336'],
    scenarioIds: ['1592'],
    setClanId: 'date',
    setDefaultProv: 'rikuzen',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  // 4. 相馬盛胤を磐城で大名として独立
  {
    id: 'soma_moritane_iwaki_1592',
    officerIds: ['off_dm_soma_1546'],
    scenarioIds: ['1592'],
    setClanId: 'soma',
    setDefaultProv: 'iwaki',
    setAssignedProv: 'iwaki',
    setDaimyo: true
  },
  {
    id: 'soma_retainers_iwaki_1592',
    officerIds: ['off_soma_yoshitane'],
    scenarioIds: ['1592'],
    setClanId: 'soma',
    setDefaultProv: 'iwaki',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  // 5. 木下勝俊は若狭で城主
  {
    id: 'kinoshita_katsutoshi_wakasa_gov_1592',
    officerIds: ['off_jd_038'],
    scenarioIds: ['1592'],
    setClanId: 'toyotomi',
    setDefaultProv: 'wakasa',
    setAssignedProv: 'wakasa',
    setDaimyo: false
  },
  // 6. 豊臣秀頼は若狭から摂津に移動
  {
    id: 'toyotomi_hideyori_settsu_1592',
    officerIds: ['off_dm_toyotomi_1600'],
    scenarioIds: ['1592'],
    setClanId: 'toyotomi',
    setDefaultProv: 'settsu',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  // 7. 花房正幸、戸川秀安、花房職秀は備前で宇喜多氏の配下待機
  {
    id: 'ukita_three_retainers_1592',
    officerIds: ['off_jd_419', 'off_jd_056', 'off_jd_031'],
    scenarioIds: ['1592'],
    setClanId: 'ukita',
    setDefaultProv: 'bizen',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  // 8. 備中の島左近は北近江に移動
  {
    id: 'shima_sakon_north_omi_1592',
    officerIds: ['off_shima_sakon'],
    scenarioIds: ['1592'],
    setClanId: 'toyotomi',
    setDefaultProv: 'north_omi',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  // 9. 備後の水野勝成は武蔵に移動
  {
    id: 'mizuno_katsunari_musashi_1592',
    officerIds: ['off_mizuno_katsunari'],
    scenarioIds: ['1592'],
    setClanId: 'tokugawa',
    setDefaultProv: 'musashi',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  // 10. 筑前の小早川隆景は大名として独立
  {
    id: 'kobayakawa_takakage_chikuzen_1592',
    officerIds: ['off_kobayakawa_takakage'],
    scenarioIds: ['1592'],
    setClanId: 'kobayakawa',
    setDefaultProv: 'chikuzen',
    setAssignedProv: 'chikuzen',
    setDaimyo: true
  },
  // 11. 南部信直と南部利直は陸中から陸奥に移動
  {
    id: 'nanbu_nobunao_toshinao_mutsu_1592',
    officerIds: ['off_dm_nanbu_1582', 'off_nanbu_toshinao'],
    scenarioIds: ['1592'],
    setClanId: 'nanbu',
    setDefaultProv: 'mutsu',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  // 1600 Scenario Updates (関ヶ原の戦い):
  // 1. 宇喜多秀家: 美作から備前へ移動（備前大名）
  {
    id: 'ukita_hideie_bizen_daimyo_1600',
    officerIds: ['off_dm_ukita_1582'],
    scenarioIds: ['1600'],
    setClanId: 'ukita',
    setDefaultProv: 'bizen',
    setAssignedProv: 'bizen',
    setDaimyo: true
  },
  // 2. 浦上氏: 浪人に
  {
    id: 'uragami_clan_ronin_1600',
    officerIds: ['off_uragami_narimune', 'off_uragami_muneyasu', 'off_uragami_munenobu', 'off_dm_uragami_1546'],
    scenarioIds: ['1600'],
    setClanId: 'ronin',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  // 3. 池田利隆: 播磨で豊臣の配下として設定
  {
    id: 'ikeda_toshitaka_toyotomi_harima_1600',
    officerIds: ['off_succ_okayama_1584_117'],
    scenarioIds: ['1600'],
    setClanId: 'toyotomi',
    setDefaultProv: 'harima',
    setAssignedProv: 'harima',
    setDaimyo: false
  },
  // 4. 丹後の細川忠興: 大名として独立
  {
    id: 'hosokawa_tadaoki_tango_daimyo_1600',
    officerIds: ['off_hosokawa_tadaoki'],
    scenarioIds: ['1600'],
    setClanId: 'hosokawa',
    setDefaultProv: 'tango',
    setAssignedProv: 'tango',
    setDaimyo: true
  },
  // 5. 南近江の京極高次: 大名として独立
  {
    id: 'kyogoku_takatsugu_south_omi_daimyo_1600',
    officerIds: ['off_kyogoku_takatsugu'],
    scenarioIds: ['1600'],
    setClanId: 'kyogoku',
    setDefaultProv: 'south_omi',
    setAssignedProv: 'south_omi',
    setDaimyo: true
  },
  // 6. 蜂須賀至鎮: 淡路から阿波へ移動（蜂須賀配下）
  {
    id: 'hachisuka_yoshishige_awa_1600',
    officerIds: ['off_hachisuka_yoshishige'],
    scenarioIds: ['1600'],
    setClanId: 'hachisuka',
    setDefaultProv: 'awa_shikoku',
    setAssignedProv: 'awa_shikoku',
    setDaimyo: false
  },
  // 801 (811) Scenario Updates (延暦・東北征討):
  // 1. 桓武天皇: 平安朝廷当主・山城居城
  {
    id: 'kanmu_tenno_daimyo_801',
    officerIds: ['off_kanmu_tenno'],
    scenarioIds: ['801'],
    setClanId: 'heian_court',
    setDefaultProv: 'yamashiro',
    setAssignedProv: 'yamashiro',
    setDaimyo: true
  },
  // 2. 坂上田村麻呂: 平安朝廷配下・陸前（多賀城）
  {
    id: 'sakanoue_tamuramaro_retainer_801',
    officerIds: ['off_sakanoue_tamuramaro'],
    scenarioIds: ['801'],
    setClanId: 'heian_court',
    setDefaultProv: 'rikuzen',
    setAssignedProv: 'rikuzen',
    setDaimyo: false
  },
  // 1221 Scenario Updates (承久の乱):
  // 1. 三浦義村: 相模で北条氏配下
  {
    id: 'miura_yoshimura_hojo_1221',
    officerIds: ['off_miura_yoshimura'],
    scenarioIds: ['1221'],
    setClanId: 'hojo_kamakura',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },
  // 2. 印東氏（印東常茂）: 北条氏配下・上総城主
  {
    id: 'indo_tsuneshige_hojo_kazusa_1221',
    officerIds: ['off_indo_tsuneshige'],
    scenarioIds: ['1221'],
    setClanId: 'hojo_kamakura',
    setDefaultProv: 'kazusa',
    setAssignedProv: 'kazusa',
    setDaimyo: false
  },
  // 1274 Scenario Updates (文永の役・蒙古襲来):
  // 1. 伊南常長: 北条氏配下・上総城主
  {
    id: 'inami_tsunenaga_hojo_kazusa_1274',
    officerIds: ['off_inami_tsunenaga'],
    scenarioIds: ['1274'],
    setClanId: 'hojo_kamakura',
    setDefaultProv: 'kazusa',
    setAssignedProv: 'kazusa',
    setDaimyo: false
  },
  // 2. 平宗清・平盛時: 山城で北条氏配下
  {
    id: 'taira_munekiyo_moritoki_hojo_yamashiro_1274',
    officerIds: ['off_taira_munekiyo', 'off_taira_moritoki', 'off_taira_munetsuna'],
    scenarioIds: ['1274'],
    setClanId: 'hojo_kamakura',
    setDefaultProv: 'yamashiro',
    setAssignedProv: 'yamashiro',
    setDaimyo: false
  },
  // 3. 佐原氏・三浦氏: 相模で北条氏配下
  {
    id: 'miura_sawara_hojo_sagami_1274',
    officerIds: ['off_succ2_miura_1225', 'off_miura_tokiaki', 'off_miura_tokitsugu'],
    scenarioIds: ['1274'],
    setClanId: 'hojo_kamakura',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },
  // 1614 Scenario Updates (大坂の陣):
  // 1. 真田十勇士: 北信濃から摂津へ移動（豊臣配下）
  {
    id: 'sanada_juyushi_settsu_1614',
    officerIds: [
      'off_sarutobi_sasuke', 'off_kirigakure_saizo', 'off_miyoshi_seikai',
      'off_miyoshi_isa', 'off_anayama_kosuke', 'off_yuri_kamanosuke',
      'off_kakei_juzo', 'off_unno_rokuro', 'off_nezu_jinpachi', 'off_mochizuki_rokuro'
    ],
    scenarioIds: ['1614'],
    setClanId: 'toyotomi',
    setDefaultProv: 'settsu',
    setAssignedProv: 'settsu',
    setDaimyo: false
  },
  // 2. 南部利直: 盛岡・陸中居城
  {
    id: 'nanbu_toshinao_rikuchu_1614',
    officerIds: ['off_nanbu_toshinao'],
    scenarioIds: ['1614', '1637'],
    setClanId: 'nanbu',
    setDefaultProv: 'rikuchu',
    setAssignedProv: 'rikuchu',
    setDaimyo: true
  },
  // 3. 蒲生忠郷: 岩代大名＆蒲生家臣
  {
    id: 'gamo_tadazato_iwashiro_1614',
    officerIds: ['off_gamo_tadazato'],
    scenarioIds: ['1614'],
    setClanId: 'gamou',
    setDefaultProv: 'iwashiro',
    setAssignedProv: 'iwashiro',
    setDaimyo: true
  },
  {
    id: 'gamo_retainers_iwashiro_1614',
    officerIds: ['off_machino_shigenori', 'off_gamo_satonari'],
    scenarioIds: ['1614'],
    setClanId: 'gamou',
    setDefaultProv: 'iwashiro',
    setAssignedProv: 'iwashiro',
    setDaimyo: false
  },
  // 4. 水戸徳川（徳川頼房）: 常陸大名独立
  {
    id: 'tokugawa_yorifusa_mito_1614',
    officerIds: ['off_tokugawa_yorifusa'],
    scenarioIds: ['1614'],
    setClanId: 'mito',
    setDefaultProv: 'hitachi',
    setAssignedProv: 'hitachi',
    setDaimyo: true
  },
  // 5. 備前・池田忠継: 徳川領配下
  {
    id: 'ikeda_tadatsugu_tokugawa_bizen_1614',
    officerIds: ['off_ikeda_tadatsugu'],
    scenarioIds: ['1614'],
    setClanId: 'tokugawa',
    setDefaultProv: 'bizen',
    setAssignedProv: 'bizen',
    setDaimyo: false
  },
  // 6. 備前浪人（宇喜多秀高、宇喜多秀継、花房職秀、花房正成）: 摂津へ移動
  {
    id: 'bizen_ronin_to_settsu_1614',
    officerIds: ['off_ukita_hidetaka', 'off_ukita_hidetsugu', 'off_jd_031', 'off_jd_371'],
    scenarioIds: ['1614'],
    setClanId: 'ronin',
    setDefaultProv: 'settsu',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  // 7. 福島正則: 安芸大名独立
  {
    id: 'fukushima_masanori_daimyo_1614',
    officerIds: ['off_fukushima_masanori'],
    scenarioIds: ['1614'],
    setClanId: 'fukushima',
    setDefaultProv: 'aki',
    setAssignedProv: 'aki',
    setDaimyo: true
  },
  // 1702, 1721, 1789 Scenario Updates (江戸時代):
  // 1702年 徳川綱吉
  {
    id: 'tokugawa_tsunayoshi_daimyo_1702',
    officerIds: ['off_tokugawa_tsunayoshi'],
    scenarioIds: ['1702'],
    setClanId: 'tokugawa',
    setDefaultProv: 'musashi',
    setAssignedProv: 'musashi',
    setDaimyo: true
  },
  // 1721年 徳川吉宗
  {
    id: 'tokugawa_yoshimune_daimyo_1721',
    officerIds: ['off_tokugawa_yoshimune'],
    scenarioIds: ['1721'],
    setClanId: 'tokugawa',
    setDefaultProv: 'musashi',
    setAssignedProv: 'musashi',
    setDaimyo: true
  },
  // 1789年 徳川家斉
  {
    id: 'tokugawa_ienari_daimyo_1789',
    officerIds: ['off_tokugawa_ienari'],
    scenarioIds: ['1789'],
    setClanId: 'tokugawa',
    setDefaultProv: 'musashi',
    setAssignedProv: 'musashi',
    setDaimyo: true
  },
  // 1789年 松平信明（徳川配下）
  {
    id: 'matsudaira_nobuakira_retainer_1789',
    officerIds: ['off_matsudaira_nobuakira'],
    scenarioIds: ['1789'],
    setClanId: 'tokugawa',
    setDefaultProv: 'totomi',
    setAssignedProv: 'totomi',
    setDaimyo: false
  },
  // 上杉鷹山（羽前米沢）
  {
    id: 'uesugi_yozan_uzen_1789',
    officerIds: ['off_uesugi_yozan'],
    scenarioIds: ['1789'],
    setClanId: 'uesugi',
    setDefaultProv: 'uzen',
    setAssignedProv: 'uzen',
    setDaimyo: true
  },
  // 1570 & 1573 Scenario Updates: 宇喜多秀家・花房正成（備前・浦上配下）
  {
    id: 'ukita_hideie_hanafusa_uragami_1570_1573',
    officerIds: ['off_dm_ukita_1582', 'off_jd_371'],
    scenarioIds: ['1570', '1573'],
    setClanId: 'uragami',
    setDefaultProv: 'bizen',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  // 1573 Scenario Onwards: 山中鹿介・尼子義久・尼子元知（播磨・浪人）
  {
    id: 'yamanaka_amago_ronin_harima_1573_onwards',
    officerIds: ['off_yamanaka_shikanosuke', 'off_dm_amago_1560', 'off_amago_mototomo'],
    scenarioIds: ['1573', '1576', '1577', '1582', '1584', '1587', '1590', '1600'],
    fromYear: 1573,
    setClanId: 'ronin',
    setDefaultProv: 'harima',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  // 1577 Scenario Updates: 来島通総（伊予・河野配下）
  {
    id: 'kurushima_michifusa_kono_1577',
    officerIds: ['off_kurushima_michifusa'],
    scenarioIds: ['1577'],
    setClanId: 'kono',
    setDefaultProv: 'iyo',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  // 斯波義銀（尾張・浪人：全シナリオ）
  {
    id: 'shiba_yoshikane_owari_ronin',
    officerIds: ['off_shiba_yoshikane'],
    setClanId: 'ronin',
    setDefaultProv: 'owari',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  // 原胤栄（下総移動）
  {
    id: 'hara_tanehide_shimousa',
    officerIds: ['off_jd_307'],
    setDefaultProv: 'shimousa',
    clearAssignment: true,
    isStandby: true
  },
  // 1331 Scenario Updates
  {
    id: 'ko_no_moronao_shimotsuke_1331',
    officerIds: ['off_ko_no_moronao'],
    scenarioIds: ['1331'],
    setClanId: 'ashikaga',
    setDefaultProv: 'shimotsuke',
    setAssignedProv: 'shimotsuke',
    setDaimyo: false
  },
  {
    id: 'uesugi_noriaki_shimotsuke_1331',
    officerIds: ['off_uesugi_noriaki_first'],
    scenarioIds: ['1331'],
    setClanId: 'ashikaga',
    setDefaultProv: 'shimotsuke',
    setAssignedProv: 'shimotsuke',
    setDaimyo: false
  },
  {
    id: 'uesugi_shigenori_shimotsuke_1331',
    officerIds: ['off_uesugi_shigenori'],
    scenarioIds: ['1331'],
    setClanId: 'ashikaga',
    setDefaultProv: 'shimotsuke',
    setAssignedProv: 'shimotsuke',
    setDaimyo: false
  },
  {
    id: 'miura_tokitaka_sagami_1331',
    officerIds: ['off_miura_tokitaka_kama'],
    scenarioIds: ['1331'],
    setClanId: 'hojo_kamakura',
    setDefaultProv: 'sagami',
    setAssignedProv: 'sagami',
    setDaimyo: false
  },
  {
    id: 'date_yukitomo_rikuzen_1331',
    officerIds: ['off_dm_date_1331'],
    scenarioIds: ['1331', '1333'],
    setClanId: 'date',
    setDefaultProv: 'rikuzen',
    setAssignedProv: 'rikuzen',
    setDaimyo: true
  },
  {
    id: 'ashina_morimune_iwashiro_1331',
    officerIds: ['off_ashina_morimune'],
    scenarioIds: ['1331', '1333'],
    setClanId: 'ashina',
    setDefaultProv: 'iwashiro',
    setAssignedProv: 'iwashiro',
    setDaimyo: true
  },

  {
    id: 'anekoji_ietsuna_hida_1331',
    officerIds: ['off_jd_224'],
    scenarioIds: ['1331'],
    setClanId: 'anekoji',
    setDefaultProv: 'hida',
    setAssignedProv: 'hida',
    setDaimyo: true
  },
  {
    id: 'muto_akiuji_uzen_1331',
    officerIds: ['off_jd_320'],
    scenarioIds: [],
    setClanId: 'muto',
    setDefaultProv: 'uzen',
    setAssignedProv: 'uzen',
    setDaimyo: false
  },
  {
    id: 'imagawa_norikuni_suruga_1331',
    officerIds: ['off_succ_imagawa_1304_41'],
    scenarioIds: ['1331'],
    setClanId: 'imagawa',
    setDefaultProv: 'suruga',
    setAssignedProv: 'suruga',
    setDaimyo: true
  },
  {
    id: 'isshiki_norouji_tango_1331',
    officerIds: ['off_isshiki_norouji'],
    scenarioIds: ['1331'],
    setClanId: 'isshiki',
    setDefaultProv: 'tango',
    setAssignedProv: 'tango',
    setDaimyo: true
  },
  {
    id: 'yamana_tokiuji_tajima_1331',
    officerIds: ['off_yamana_tokiuji'],
    scenarioIds: ['1331'],
    setClanId: 'yamana',
    setDefaultProv: 'tajima',
    setAssignedProv: 'tajima',
    setDaimyo: true
  },
  {
    id: 'ko_no_morofuyu_shimotsuke_1331',
    officerIds: ['off_ko_no_morofuyu'],
    scenarioIds: ['1331'],
    setClanId: 'ashikaga',
    setDefaultProv: 'shimotsuke',
    setAssignedProv: 'shimotsuke',
    setDaimyo: false
  },
  {
    id: 'uesugi_shigenori_yamashiro_1331',
    officerIds: ['off_uesugi_shigenori'],
    scenarioIds: [],
    setClanId: 'ashikaga',
    setDefaultProv: 'shimotsuke',
    setAssignedProv: 'shimotsuke',
    setDaimyo: false
  },
  {
    id: 'masuda_kanemi_iwami_1331',
    officerIds: ['off_masuda_kanemi'],
    scenarioIds: ['1331'],
    setClanId: 'masuda',
    setDefaultProv: 'iwami',
    setAssignedProv: 'iwami',
    setDaimyo: true
  },
  // 1274 Scenario Updates
  {
    id: 'nanbu_masamitsu_mutsu_1274',
    officerIds: ['off_nanbu_masamitsu'],
    scenarioIds: ['1274'],
    setClanId: 'nanbu',
    setDefaultProv: 'mutsu',
    setAssignedProv: 'mutsu',
    setDaimyo: true
  },
  {
    id: 'kasai_kiyomune_rikuchu_1274',
    officerIds: ['off_kasai_kiyomune'],
    scenarioIds: ['1274'],
    setClanId: 'kasai',
    setDefaultProv: 'rikuchu',
    setAssignedProv: 'rikuchu',
    setDaimyo: true
  },
  {
    id: 'date_masayori_rikuzen_1274',
    officerIds: ['off_date_masayori'],
    scenarioIds: ['1274'],
    setClanId: 'date',
    setDefaultProv: 'rikuzen',
    setAssignedProv: 'rikuzen',
    setDaimyo: true
  },
  {
    id: 'jo_sukemasa_echigo_1274',
    officerIds: ['off_jo_sukemasa'],
    scenarioIds: ['1274'],
    setClanId: 'hojo_kamakura',
    setDefaultProv: 'echigo',
    setAssignedProv: 'echigo',
    setDaimyo: false
  },
  {
    // 1274 村上胤信（信村の嫡子・一門。当主は村上信村）
    id: 'murakami_tanenobu_north_shinano_1274',
    officerIds: ['off_succ_murakami_1260_97'],
    scenarioIds: ['1274'],
    setClanId: 'murakami',
    setDefaultProv: 'north_shinano',
    setAssignedProv: 'north_shinano',
    setDaimyo: false
  },
  // 1221 Scenario Updates
  {
    id: 'nanbu_mitsuyuki_mutsu_1221',
    officerIds: ['off_dm_nanbu_1221'],
    scenarioIds: ['1221'],
    setClanId: 'nanbu',
    setDefaultProv: 'mutsu',
    setAssignedProv: 'mutsu',
    setDaimyo: true
  },
  {
    id: 'kasai_kiyoshige_rikuchu_1221',
    officerIds: ['off_dm_kasai_1221'],
    scenarioIds: ['1221'],
    setClanId: 'kasai',
    setDefaultProv: 'rikuchu',
    setAssignedProv: 'rikuchu',
    setDaimyo: true
  },
  {
    id: 'date_tomomune_rikuzen_1221',
    officerIds: ['off_dm_date_1221'],
    scenarioIds: ['1221'],
    setClanId: 'date',
    setDefaultProv: 'rikuzen',
    setAssignedProv: 'rikuzen',
    setDaimyo: true
  },
  {
    id: 'koyama_tomomasa_shimotsuke_1221',
    officerIds: ['off_koyama_tomomasa'],
    scenarioIds: ['1221'],
    setClanId: 'hojo_kamakura',
    setDefaultProv: 'shimotsuke',
    clearAssignment: true,
    setDaimyo: false
  },
  {
    id: 'satake_yoshimori_hitachi_1221',
    officerIds: ['off_succ2_satake_1185'],
    scenarioIds: ['1221'],
    setClanId: 'satake',
    setDefaultProv: 'hitachi',
    setAssignedProv: 'hitachi',
    setDaimyo: true
  },
  {
    id: 'ashikaga_yoshiuji_mikawa_1221',
    officerIds: ['off_ashikaga_yoshiuji'],
    scenarioIds: ['1221'],
    setClanId: 'hojo_kamakura',
    setDefaultProv: 'mikawa',
    setAssignedProv: 'mikawa',
    setDaimyo: false
  },
  {
    id: 'kamakura_vassals_sagami_1221',
    officerIds: [
      'off_miura_yoshimura',
      'off_miura_mitsumura',
      'off_mori_suemitsu',
      'off_hojo_yasutoki',
      'off_hojo_masamura'
    ],
    scenarioIds: ['1221'],
    setClanId: 'hojo_kamakura',
    setDefaultProv: 'sagami',
    clearAssignment: true,
    isStandby: true,
    setDaimyo: false
  },
  {
    id: 'yuki_tomomitsu_sagami_1221',
    officerIds: ['off_yuki_tomomitsu'],
    scenarioIds: ['1221'],
    setClanId: 'hojo_kamakura',
    setDefaultProv: 'sagami',
    clearAssignment: true,
    setDaimyo: false
  },
  {
    id: 'hojo_masako_sagami_1221',
    officerIds: ['off_hojo_masako'],
    scenarioIds: ['1221'],
    setClanId: 'hojo_kamakura',
    setDefaultProv: 'sagami',
    clearAssignment: true,
    setDaimyo: false
  },
  {
    id: 'oe_no_hiromoto_sagami_1221',
    officerIds: ['off_oe_no_hiromoto'],
    scenarioIds: ['1221'],
    setClanId: 'hojo_kamakura',
    setDefaultProv: 'sagami',
    clearAssignment: true,
    setDaimyo: false
  },
];
  const target = (typeof window !== "undefined" && window.OFFICER_AFFILIATION_RULES) ? window.OFFICER_AFFILIATION_RULES : OFFICER_AFFILIATION_RULES;
  target.push(...extraRules);
  const rules = target;
  rules.unshift(
  // ===== 1651年以降: 山田右衛門作・山田秀右衛門は肥前で浪人 =====
  {
    id: 'yamada_ronin_hizen_1651_on',
    officerIds: ['off_yamada_emonsaku', 'off_yamada_shiyusaku'],
    fromYear: 1651,
    toYear: 1877,
    setClanId: 'ronin',
    setDefaultProv: 'hizen',
    clearAssignment: true,
    setDaimyo: false
  },
  // ===== 江戸時代: 宇喜多氏(1637年以降)は武蔵で浪人、秋田氏は常陸で浪人 =====
  {
    id: 'ukita_ronin_musashi_1637_on',
    officerIds: ['off_ukita_hidetsugu', 'off_ukita_hidetaka', 'off_ukita_hidetane', 'off_ukita_hidemasa'],
    fromYear: 1637,
    toYear: 1868,
    setClanId: 'ronin',
    setDefaultProv: 'musashi',
    clearAssignment: true,
    setDaimyo: false
  },
  {
    id: 'akita_ronin_hitachi_edo',
    officerIds: ['off_akita_sadamisue', 'off_akita_terisue', 'off_dm_ando_1582', 'off_succ_ando_1580_5', 'off_akita_toshisue', 'off_akita_morisue', 'off_akita_yorisue'],
    fromYear: 1603,
    toYear: 1868,
    setClanId: 'ronin',
    setDefaultProv: 'hitachi',
    clearAssignment: true,
    setDaimyo: false
  },
  // ===== 江戸時代: 日向は伊東氏が独立、島津氏の武将は薩摩へ =====
  {
    id: 'ito_daimyo_hyuga_1614',
    officerIds: ['off_ito_sukeyoshi'],
    scenarioIds: ['1614'],
    setClanId: 'ito',
    setDefaultProv: 'hyuga',
    setAssignedProv: 'hyuga',
    setDaimyo: true
  },
  {
    id: 'ito_clan_hyuga_1614',
    officerIds: ['off_ito_sukeisa', 'off_succ2_ito_1580'],
    scenarioIds: ['1614'],
    setClanId: 'ito',
    setDefaultProv: 'hyuga',
    setAssignedProv: 'hyuga',
    setDaimyo: false
  },
  {
    id: 'shimazu_hyuga_to_satsuma_1614',
    officerIds: ['off_edo_shimazu_1596_185'],
    scenarioIds: ['1614'],
    setClanId: 'shimazu',
    setDefaultProv: 'satsuma',
    setAssignedProv: 'satsuma',
    setDaimyo: false
  },
  {
    id: 'ito_daimyo_hyuga_1637',
    officerIds: ['off_ito_sukeisa'],
    scenarioIds: ['1637'],
    setClanId: 'ito',
    setDefaultProv: 'hyuga',
    setAssignedProv: 'hyuga',
    setDaimyo: true
  },
  {
    id: 'ito_clan_hyuga_1637',
    officerIds: ['off_succ2_ito_1630'],
    scenarioIds: ['1637'],
    setClanId: 'ito',
    setDefaultProv: 'hyuga',
    setAssignedProv: 'hyuga',
    setDaimyo: false
  },
  {
    id: 'shimazu_hyuga_to_satsuma_1637',
    officerIds: ['off_edo_shimazu_1596_185'],
    scenarioIds: ['1637'],
    setClanId: 'shimazu',
    setDefaultProv: 'satsuma',
    setAssignedProv: 'satsuma',
    setDaimyo: false
  },
  {
    id: 'ito_daimyo_hyuga_1702',
    officerIds: ['off_ito_sukezane'],
    scenarioIds: ['1702'],
    setClanId: 'ito',
    setDefaultProv: 'hyuga',
    setAssignedProv: 'hyuga',
    setDaimyo: true
  },
  {
    id: 'ito_clan_hyuga_1702',
    officerIds: ['off_ito_suketaka'],
    scenarioIds: ['1702'],
    setClanId: 'ito',
    setDefaultProv: 'hyuga',
    setAssignedProv: 'hyuga',
    setDaimyo: false
  },
  {
    id: 'shimazu_hyuga_to_satsuma_1702',
    officerIds: ['off_jd_449', 'off_jd_101'],
    scenarioIds: ['1702'],
    setClanId: 'shimazu',
    setDefaultProv: 'satsuma',
    setAssignedProv: 'satsuma',
    setDaimyo: false
  },
  {
    id: 'ito_daimyo_hyuga_1721',
    officerIds: ['off_ito_suketaka'],
    scenarioIds: ['1721'],
    setClanId: 'ito',
    setDefaultProv: 'hyuga',
    setAssignedProv: 'hyuga',
    setDaimyo: true
  },
  {
    id: 'shimazu_hyuga_to_satsuma_1721',
    officerIds: ['off_jd_449'],
    scenarioIds: ['1721'],
    setClanId: 'shimazu',
    setDefaultProv: 'satsuma',
    setAssignedProv: 'satsuma',
    setDaimyo: false
  },
  {
    id: 'ito_daimyo_hyuga_1789',
    officerIds: ['off_edo_ito_sukeyoshi_1789'],
    scenarioIds: ['1789'],
    setClanId: 'ito',
    setDefaultProv: 'hyuga',
    setAssignedProv: 'hyuga',
    setDaimyo: true
  },
  {
    id: 'shimazu_hisamitsu_satsuma_1866',
    officerIds: ['off_edo_shimazu_1817_184'],
    scenarioIds: ['1866'],
    setClanId: 'shimazu',
    setDefaultProv: 'satsuma',
    setAssignedProv: 'satsuma',
    setDaimyo: false
  },
  // ===== 江戸時代の配置 (蘆名/北条/里見/尼子/宇都宮/龍造寺/鈴木) =====
  {
    id: 'ashina_satake_ugo_edo',
    officerIds: ['off_ashina_yoshihiro', 'off_ashina_moritoshi', 'off_ashina_sendrumaru', 'off_ashina_morinobu'],
    fromYear: 1603,
    toYear: 1868,
    setClanId: 'satake',
    setDefaultProv: 'ugo',
    setAssignedProv: 'ugo',
    requireOwners: ['satake'],
    setDaimyo: false
  },
  {
    id: 'hojo_tokugawa_musashi_edo',
    officerIds: ['off_succ_hojo_1600_25', 'off_hojo_ujimune', 'off_hojo_ujiharu', 'off_succ2_hojo_1558', 'off_hojo_ujinobu', 'off_hojo_ujitomo', 'off_hojo_ujisada'],
    fromYear: 1603,
    toYear: 1868,
    setClanId: 'tokugawa',
    setDefaultProv: 'musashi',
    setAssignedProv: 'musashi',
    requireOwners: ['tokugawa'],
    setDaimyo: false
  },
  {
    id: 'satomi_tokugawa_musashi_edo',
    officerIds: ['off_succ_satomi_1605_155', 'off_satomi_yoshinao', 'off_satomi_tadanao', 'off_satomi_yoshihiro_edo'],
    fromYear: 1651,
    toYear: 1868,
    setClanId: 'tokugawa',
    setDefaultProv: 'musashi',
    setAssignedProv: 'musashi',
    requireOwners: ['tokugawa'],
    setDaimyo: false
  },
  {
    id: 'amago_mori_nagato_edo',
    officerIds: ['off_amago_naritomo', 'off_amago_nariyasu'],
    fromYear: 1651,
    toYear: 1868,
    setClanId: 'mori',
    setDefaultProv: 'nagato',
    setAssignedProv: 'nagato',
    requireOwners: ['mori'],
    setDaimyo: false
  },
  {
    id: 'utsunomiya_mito_hitachi_edo',
    officerIds: ['off_utsunomiya_yoshitsuna', 'off_utsunomiya_takatsuna', 'off_utsunomiya_hirotsuna_edo', 'off_succ2_utsunomiya_1685'],
    fromYear: 1603,
    toYear: 1868,
    setClanId: 'mito',
    setDefaultProv: 'hitachi',
    setAssignedProv: 'hitachi',
    requireOwners: ['mito'],
    setDaimyo: false
  },
  {
    id: 'ryuzoji_nabeshima_hizen_edo',
    officerIds: ['off_ryuzoji_nagamori'],
    fromYear: 1603,
    toYear: 1868,
    setClanId: 'nabeshima',
    setDefaultProv: 'hizen',
    setAssignedProv: 'hizen',
    requireOwners: ['nabeshima'],
    setDaimyo: false
  },
  {
    id: 'suzuki_mito_hitachi_edo',
    officerIds: ['off_suzuki_shigetsugu', 'off_suzuki_shigenaga'],
    fromYear: 1603,
    toYear: 1868,
    setClanId: 'mito',
    setDefaultProv: 'hitachi',
    setAssignedProv: 'hitachi',
    requireOwners: ['mito'],
    setDaimyo: false
  },
  {
    id: 'hachisuka_yoshishige_daimyo_1614',
    officerIds: ['off_hachisuka_yoshishige'],
    scenarioIds: ['1614'],
    setClanId: 'hachisuka',
    setDefaultProv: 'awa_shikoku',
    setAssignedProv: 'awa_shikoku',
    setDaimyo: true
  },
  // ===== 1637/1651 シナリオ配置修正 =====
  {
    id: 'hosokawa_tadaoki_higo_1637',
    officerIds: ['off_hosokawa_tadaoki'],
    scenarioIds: ['1637'],
    setClanId: 'hosokawa',
    setDefaultProv: 'higo',
    setAssignedProv: 'higo',
    setDaimyo: false
  },
  {
    id: 'matsudaira_tadateru_echigo_1637_1651',
    officerIds: ['off_succ2_matsudaira_1592'],
    scenarioIds: ['1637', '1651'],
    setClanId: 'tokugawa',
    setDefaultProv: 'echigo',
    setAssignedProv: 'echigo',
    setDaimyo: false
  },
  {
    id: 'hachisuka_iemasa_tokushima_1637',
    officerIds: ['off_hachisuka_iemasa'],
    scenarioIds: ['1637'],
    setClanId: 'hachisuka',
    setDefaultProv: 'awa_shikoku',
    setAssignedProv: 'awa_shikoku',
    setDaimyo: false
  },
  {
    id: 'kiire_tadatsugu_osumi_1651',
    officerIds: ['off_edo_shimazu_1596_185'],
    scenarioIds: ['1651'],
    setClanId: 'shimazu',
    setDefaultProv: 'osumi',
    setAssignedProv: 'osumi',
    setDaimyo: false
  },
  {
    id: 'ito_sukehisa_hyuga_daimyo_1651',
    officerIds: ['off_ito_sukeisa'],
    scenarioIds: ['1651'],
    setClanId: 'ito',
    setDefaultProv: 'hyuga',
    setAssignedProv: 'hyuga',
    setDaimyo: true
  },
  {
    id: 'ito_clan_hyuga_1651',
    officerIds: ['off_succ2_ito_1630', 'off_ito_sukezane'],
    scenarioIds: ['1651'],
    setClanId: 'ito',
    setDefaultProv: 'hyuga',
    setAssignedProv: 'hyuga',
    setDaimyo: false
  },
  {
    id: 'kitsuregawa_tokugawa_yamashiro_1651',
    officerIds: ['off_kitsuregawa_takauji', 'off_kitsuregawa_akiuji'],
    scenarioIds: ['1651'],
    setClanId: 'tokugawa',
    setDefaultProv: 'yamashiro',
    setAssignedProv: 'yamashiro',
    setDaimyo: false
  },
  // 北郷忠相: すべてのシナリオで大隅・島津氏配下
  {
    id: 'hongo_tadamori_osumi_all',
    officerIds: ['off_hongo_tadamori'],
    setClanId: 'shimazu',
    setDefaultProv: 'osumi',
    setAssignedProv: 'osumi',
    setDaimyo: false
  },

  // 蒲生氏: 1590年までのシナリオで南近江に配置
  {
    id: 'gamo_clan_south_omi_oda',
    officerIds: ['off_gamo_ujisato', 'off_gamo_satoyasu', 'off_gamo_satonari', 'off_machino_shigenori'],
    scenarioIds: ['1570', '1573', '1576', '1577', '1582'],
    fromYear: 1570,
    toYear: 1582,
    setClanId: 'oda',
    setDefaultProv: 'south_omi',
    setAssignedProv: 'south_omi',
    setDaimyo: false
  },
  {
    id: 'gamo_clan_south_omi_toyotomi',
    officerIds: ['off_gamo_ujisato', 'off_gamo_satoyasu', 'off_gamo_satonari', 'off_machino_shigenori'],
    scenarioIds: ['1584', '1587', '1590'],
    fromYear: 1584,
    toYear: 1590,
    setClanId: 'toyotomi',
    setDefaultProv: 'south_omi',
    setAssignedProv: 'south_omi',
    setDaimyo: false
  },

  // 1614年大坂の陣シナリオの武将移動
  // 奥村永福: 安芸から能登へ移動（前田家配下）
  {
    id: 'okumura_nagatomi_noto_1614',
    officerIds: ['off_jd_422'],
    scenarioIds: ['1614'],
    setClanId: 'maeda',
    setDefaultProv: 'noto',
    setAssignedProv: 'noto',
    setDaimyo: false
  },
  // 蜂須賀家政: 安芸から阿波へ移動（蜂須賀家配下）
  {
    id: 'hachisuka_iemasa_awa_1614',
    officerIds: ['off_hachisuka_iemasa'],
    scenarioIds: ['1614'],
    setClanId: 'hachisuka',
    setDefaultProv: 'awa_shikoku',
    setAssignedProv: 'awa_shikoku',
    setDaimyo: false
  },
  // 織田信包: 安芸から伊勢へ移動（徳川家配下）
  {
    id: 'oda_nobukane_ise_1614',
    officerIds: ['off_jd_059'],
    scenarioIds: ['1614'],
    setClanId: 'tokugawa',
    setDefaultProv: 'ise',
    setAssignedProv: 'ise',
    setDaimyo: false
  },
  // 長宗我部盛恒: 土佐から摂津へ移動（豊臣家配下）
  {
    id: 'chosokabe_moritsune_settsu_1614',
    officerIds: ['off_chosokabe_moritsune'],
    scenarioIds: ['1614'],
    setClanId: 'toyotomi',
    setDefaultProv: 'settsu',
    setAssignedProv: 'settsu',
    setDaimyo: false
  },
  // 津川義近: 陸中から尾張へ移動
  {
    id: 'tsugawa_chikayoshi_owari',
    officerIds: ['off_tsugawa_chikayoshi'],
    setDefaultProv: 'owari',
    setAssignedProv: 'owari',
    setClanId: 'owari',
    setDaimyo: false
  },
    // 承平・天慶の乱：小野好古は朝廷の追捕使長官（平貞盛の配下ではない）
    { id: 'ono_yoshifuru_court', officerIds: ['off_ono_yoshifuru'], setClanId: 'heian_court', fromYear: 930, toYear: 968, scenarioIds: ['939'], requireOwners: ['heian_court'], setDaimyo: false },
    // 柴田勝家・佐久間盛政は本能寺まで織田家臣（柴田家が地図に立ったら柴田家）
    { id: 'shibata_oda_service', officerIds: ['off_shibata_katsuie', 'off_sakuma_morimasa'], setClanId: 'oda', fromYear: 1546, toYear: 1582, requireOwners: ['oda'], unlessOwner: 'shibata', setDaimyo: false },
    // 明智光秀は本能寺まで織田家臣（明智家が地図に立ったら明智家）
    { id: 'akechi_mitsuhide_oda', officerIds: ['off_akechi_mitsuhide'], setClanId: 'oda', fromYear: 1568, toYear: 1582, requireOwners: ['oda'], unlessOwner: 'akechi', setDaimyo: false },
    // 織田信包は織田家臣
    { id: 'oda_nobukane_oda', officerIds: ['off_jd_059'], setClanId: 'oda', fromYear: 1546, toYear: 1600, requireOwners: ['oda'], setDaimyo: false },
    // 真田昌幸・信尹ら：真田家が地図に無い間は武田家臣
    { id: 'sanada_takeda_service', officerIds: ['off_sanada_masayuki', 'off_sanada_nobutada', 'off_sanada_nobuyuki', 'off_sanada_yukimura'], setClanId: 'takeda', fromYear: 1550, toYear: 1582, requireOwners: ['takeda'], unlessOwner: 'sanada', setDaimyo: false },
    // 黒田官兵衛：播磨・赤松氏家臣（秀吉仕官前／黒田家未登場）
    { id: 'kanbei_akamatsu_service', officerIds: ['off_kuroda_kanbei'], setClanId: 'akamatsu', fromYear: 1560, toYear: 1577, requireOwners: ['akamatsu'], unlessOwner: 'kuroda', setDaimyo: false },
    // 赤井直正は波多野家臣
    { id: 'akai_hatano_service', officerIds: ['off_jd_257'], setClanId: 'hatano', fromYear: 1546, toYear: 1579, requireOwners: ['hatano'], setDaimyo: false },
    // 三木直頼・姉小路頼綱は姉小路家
    { id: 'anekoji_retainers', officerIds: ['off_jd_248', 'off_anekoji_yoritsuna'], setClanId: 'anekoji', fromYear: 1495, toYear: 1582, requireOwners: ['anekoji'], setDaimyo: false }
  );
})();

// 史実配置の補正（続き）：源平期の仕官先・個別の所属
window.CLAN_SERVICE_FALLBACKS.push(
  { clanIds: ['genji_yoritomo'], setClanId: 'minamoto_yoshitomo', fromYear: 1150, toYear: 1160 },
  { clanIds: ['minamoto_yoshitomo', 'chiba', 'kazusa_nosuke'], setClanId: 'genji_yoritomo', fromYear: 1180, toYear: 1199 }
);
window.OFFICER_AFFILIATION_RULES.unshift(
  { id: 'yohiko_kiyohara', officerIds: ['off_yohiko_hidetake'], setClanId: 'kiyohara', fromYear: 1050, toYear: 1086, requireOwners: ['kiyohara'], setDaimyo: false },
  { id: 'munetada_court_1087', officerIds: ['off_fujiwara_munetada'], setClanId: 'heian_court', fromYear: 1080, toYear: 1141, requireOwners: ['heian_court'], setDaimyo: false },
  { id: 'oba_hogen_1156', officerIds: ['off_oba_kagechika'], setClanId: 'minamoto_yoshitomo', fromYear: 1150, toYear: 1160, requireOwners: ['minamoto_yoshitomo'], setDaimyo: false },
  { id: 'nobuyori_goshirakawa_1156', officerIds: ['off_fujiwara_nobuyori'], setClanId: 'goshirakawa_in', fromYear: 1150, toYear: 1160, requireOwners: ['goshirakawa_in'], setDaimyo: false },
  { id: 'genji_kanto_1180', officerIds: ['off_hojo_tokimasa', 'off_kajiwara_kagetoki', 'off_kumagai_naozane', 'off_miura_yoshiaki', 'off_sasaki_hideyoshi_heian', 'off_hidesato_succ_5'], setClanId: 'genji_yoritomo', fromYear: 1180, toYear: 1185, requireOwners: ['genji_yoritomo'], setDaimyo: false }
);
window.CLAN_SERVICE_FALLBACKS.push(
  // 徳川改姓（1566）前の三河衆は松平家
  { clanIds: ['tokugawa'], setClanId: 'matsudaira', fromYear: 1540, toYear: 1566 }
);
window.OFFICER_AFFILIATION_RULES.unshift(
  // 成瀬正肥は尾張藩の付家老（犬山）
  { id: 'naruse_owari_bakumatsu', officerIds: ['off_jd_067'], setClanId: 'owari', fromYear: 1850, toYear: 1871, requireOwners: ['owari'], setDaimyo: false }
);
(function () {
  // 1560：松平家が地図にあれば、三河衆は今川へ直に吸収しない
  const r = (window.OFFICER_AFFILIATION_RULES || []).find(x => x && x.id === 'single_1560_imagawa_家康_50');
  if (r) r.unlessOwner = 'matsudaira';
})();

// --- ronin audit 2026-10-05 ---
window.CLAN_SERVICE_FALLBACKS.push(
  // 宇喜多氏が地図に立つ前は浦上家臣
  { clanIds: ['ukita'], setClanId: 'uragami', fromYear: 1530, toYear: 1559 },
  // 斎藤滅亡後の美濃衆の一部（竹中は個別ルールでもカバー）
  { clanIds: ['takenaka'], setClanId: 'oda', fromYear: 1567, toYear: 1582 },
  // 村上義清ら：信濃喪失後は上杉
  { clanIds: ['murakami'], setClanId: 'uesugi', fromYear: 1553, toYear: 1578 },
  // 長尾（晴景ら）：謙信改姓後の上杉
  { clanIds: ['nagao'], setClanId: 'uesugi', fromYear: 1551, toYear: 1582 },
  // 諏訪・小笠原：武田傘下期
  { clanIds: ['suwa'], setClanId: 'takeda', fromYear: 1542, toYear: 1582 },
  { clanIds: ['ogasawara'], setClanId: 'takeda', fromYear: 1555, toYear: 1582 },
  // 北畠：伊勢織田支配後
  { clanIds: ['kitabatake'], setClanId: 'oda', fromYear: 1569, toYear: 1582 }
);
window.OFFICER_AFFILIATION_RULES.unshift(
  // A) 竹中半兵衛：稲葉山開城後〜病没まで織田（秀吉参謀）
  { id: 'takenaka_hanbei_oda', officerIds: ['off_takenaka_hanbei'], setClanId: 'oda', fromYear: 1567, toYear: 1579, requireOwners: ['oda'], setDaimyo: false },
  // 1560以前は斎藤家臣（主家が地図にあるとき）
  { id: 'takenaka_hanbei_saito', officerIds: ['off_takenaka_hanbei'], setClanId: 'saito', fromYear: 1544, toYear: 1566, requireOwners: ['saito'], setDaimyo: false },
  // F) 前野長康・蜂須賀正勝＝織田家臣（豊臣家が地図に立つまで）
  { id: 'maeno_hachisuka_oda', officerIds: ['off_maeno_nagayasu', 'off_hachisuka_koroku'], setClanId: 'oda', fromYear: 1546, toYear: 1582, requireOwners: ['oda'], unlessOwner: 'toyotomi', setDaimyo: false },
  // D) 宇喜多直家：宇喜多領が立つまで浦上家臣
  { id: 'ukita_naoie_uragami', officerIds: ['off_dm_ukita_1560'], setClanId: 'uragami', fromYear: 1546, toYear: 1559, requireOwners: ['uragami'], unlessOwner: 'ukita', setDaimyo: false },
  // 宇喜多一門（花房ら）も同様
  { id: 'ukita_retainers_uragami', officerIds: ['off_jd_419', 'off_jd_031'], setClanId: 'uragami', fromYear: 1546, toYear: 1559, requireOwners: ['uragami'], unlessOwner: 'ukita', setDaimyo: false },
  // E) 松平広忠は松平当主
  { id: 'hirotada_matsudaira_daimyo', officerIds: ['off_matsudaira_hirotada'], setClanId: 'matsudaira', fromYear: 1540, toYear: 1549, requireOwners: ['matsudaira'], setDaimyo: true },
  // 酒井忠次：松平／徳川家臣（今川直属にしない）
  { id: 'sakai_matsudaira_service', officerIds: ['off_sakai_tadatsugu'], setClanId: 'matsudaira', fromYear: 1540, toYear: 1566, requireOwners: ['matsudaira'], unlessOwner: 'tokugawa', setDaimyo: false },
  // 北畠具教ら：伊勢織田支配後は織田家臣
  { id: 'kitabatake_oda_service', officerIds: ['off_dm_kitabatake_1560', 'off_kitabatake_tomochika'], setClanId: 'oda', fromYear: 1569, toYear: 1582, requireOwners: ['oda'], unlessOwner: 'kitabatake', setDaimyo: false },
  // 村上義清：上杉家臣
  { id: 'murakami_yoshikiyo_uesugi', officerIds: ['off_dm_murakami_1546'], setClanId: 'uesugi', fromYear: 1553, toYear: 1573, requireOwners: ['uesugi'], unlessOwner: 'murakami', setDaimyo: false }
);
(function () {
  // 1560 今川吸収ルールに松平除外は既存。広忠生存シナリオでも酒井を今川へ引きずらない
  const r = (window.OFFICER_AFFILIATION_RULES || []).find(x => x && x.id === 'single_1560_imagawa_家康_50');
  if (r) r.unlessOwner = 'matsudaira';
  // odaRetainers に半兵衛・前野・蜂須賀を追加
  const oda = (window.OFFICER_AFFILIATION_RULES || []).find(x => x && x.id === 'auto_any_oda_odaRetainers_6');
  if (oda && Array.isArray(oda.officerIds)) {
    for (const id of ['off_takenaka_hanbei', 'off_maeno_nagayasu', 'off_hachisuka_koroku']) {
      if (!oda.officerIds.includes(id)) oda.officerIds.push(id);
    }
  }
})();

// ゆかりの家臣で上書きしない史実城代（シナリオID → 領国 → 武将ID）;
if (typeof window !== "undefined") window.CLAN_SERVICE_FALLBACKS = CLAN_SERVICE_FALLBACKS;

// --- sekigahara_1600_user_updates_20261011b: 1600 関ヶ原シナリオの武将配置（ユーザー指定）。1614年以降ルールより後ろに置く ---
if (typeof window !== 'undefined' && window.OFFICER_AFFILIATION_RULES) {
  window.OFFICER_AFFILIATION_RULES.unshift(
    // 長尾景広・長尾景利：会津（岩代）の上杉家臣
    { id: 'nagao_kagehiro_kagetoshi_uesugi_iwashiro_1600', officerIds: ['off_nagao_kagehiro', 'off_nagao_kagetoshi'], scenarioIds: ['1600'], setClanId: 'uesugi', requireOwners: ['uesugi'], setDefaultProv: 'iwashiro', setDaimyo: false },
    // 島左近：佐和山（北近江）の石田家臣
    { id: 'shima_sakon_ishida_north_omi_1600', officerIds: ['off_shima_sakon'], scenarioIds: ['1600'], setClanId: 'ishida', requireOwners: ['ishida'], setDefaultProv: 'north_omi', setDaimyo: false },
    // 丹羽長重：越前（石田領）の石田家臣
    { id: 'niwa_nagashige_ishida_echizen_1600', officerIds: ['off_niwa_nagashige'], scenarioIds: ['1600'], setClanId: 'ishida', requireOwners: ['ishida'], setDefaultProv: 'echizen', setDaimyo: false },
    // 石川貞清：美濃の石田家臣
    { id: 'ishikawa_sadakiyo_ishida_mino_1600', officerIds: ['off_jd_058'], scenarioIds: ['1600'], setClanId: 'ishida', requireOwners: ['ishida'], setDefaultProv: 'mino', setDaimyo: false }
  );
}

// --- sekigahara_1600_part2_20261011c: 1600 関ヶ原シナリオ追加配置（ユーザー指定・その2）。1614年以降ルールより後ろに置く ---
if (typeof window !== 'undefined' && window.OFFICER_AFFILIATION_RULES) {
  window.OFFICER_AFFILIATION_RULES.unshift(
    // 日向伊東家：当主 伊東祐兵
    { id: 'ito_sukemasu_daimyo_hyuga_1600', officerIds: ['off_succ_ito_1550_45'], scenarioIds: ['1600'], requireOwners: ['ito'], setClanId: 'ito', setDefaultProv: 'hyuga', setAssignedProv: 'hyuga', setDaimyo: true },
    // 日向伊東家：一門・家臣
    { id: 'ito_clan_hyuga_1600', officerIds: ['off_succ2_ito_1580', 'off_ito_sukeyoshi'], scenarioIds: ['1600'], requireOwners: ['ito'], setClanId: 'ito', setDefaultProv: 'hyuga', setDaimyo: false },
    // 島津忠恒・島津以久：薩摩の島津家臣
    { id: 'shimazu_tadatsune_tohisahisa_satsuma_1600', officerIds: ['off_shimazu_tadatsune', 'off_shimazu_tohisahisa'], scenarioIds: ['1600'], requireOwners: ['shimazu'], setClanId: 'shimazu', setDefaultProv: 'satsuma', setDaimyo: false },
    // 蜂須賀至鎮：阿波は豊臣領のため豊臣家臣（蜂須賀家は地図にない）
    { id: 'hachisuka_yoshishige_toyotomi_1600', officerIds: ['off_hachisuka_yoshishige'], scenarioIds: ['1600'], requireOwners: ['toyotomi'], unlessOwner: 'hachisuka', setClanId: 'toyotomi', setDefaultProv: 'awa_shikoku', setDaimyo: false },
    // 蒲生郷成・町野繁仍（蒲生家中）：下野の徳川家臣
    { id: 'gamo_machino_tokugawa_shimotsuke_1600', officerIds: ['off_gamo_satonari', 'off_machino_shigenori'], scenarioIds: ['1600'], requireOwners: ['tokugawa'], setClanId: 'tokugawa', setDefaultProv: 'shimotsuke', setDaimyo: false }
  );
}

// --- edo_1614_1637_part2_20261011d: 1614・1637 追加配置（ユーザー指定・その2） ---
if (typeof window !== 'undefined' && window.OFFICER_AFFILIATION_RULES) {
  window.OFFICER_AFFILIATION_RULES.unshift(
    // 有馬直純：日向の浪人
    { id: 'arima_naozumi_ronin_hyuga_1614_1637', officerIds: ['off_jd_053'], scenarioIds: ['1614', '1637'], setClanId: 'ronin', setDefaultProv: 'hyuga', clearAssignment: true, setDaimyo: false },
    // 喜連川尊氏：山城の徳川家臣
    { id: 'kitsuregawa_takauji_tokugawa_yamashiro_1637', officerIds: ['off_kitsuregawa_takauji'], scenarioIds: ['1637'], requireOwners: ['tokugawa'], setClanId: 'tokugawa', setDefaultProv: 'yamashiro', setDaimyo: false },
    // 町野繁仍：下野の徳川家臣（1600 と同様）。1614 は岩代の蒲生家臣（gamo_retainers_iwashiro_1614）とするため 1637 のみ
    { id: 'machino_tokugawa_shimotsuke_1637', officerIds: ['off_machino_shigenori'], scenarioIds: ['1637'], requireOwners: ['tokugawa'], setClanId: 'tokugawa', setDefaultProv: 'shimotsuke', setDaimyo: false }
  );
}

// --- officer_moves_part3_20261011e: 武将移動（ユーザー指定・その3）。移動元に居る 1637・1651 のみ ---
if (typeof window !== 'undefined' && window.OFFICER_AFFILIATION_RULES) {
  window.OFFICER_AFFILIATION_RULES.unshift(
    // 木下俊治：豊後の浪人
    { id: 'kinoshita_toshiharu_ronin_bungo_1637_1651', officerIds: ['off_kinoshita_toshiharu'], scenarioIds: ['1637', '1651'], setClanId: 'ronin', setDefaultProv: 'bungo', clearAssignment: true, setDaimyo: false },
    // 加藤重正：羽前の浪人
    { id: 'kato_shigemasa_ronin_uzen_1637_1651', officerIds: ['off_kato_shigemasa'], scenarioIds: ['1637', '1651'], setClanId: 'ronin', setDefaultProv: 'uzen', clearAssignment: true, setDaimyo: false },
    // 今川直房：下野の徳川家臣
    { id: 'imagawa_naofusa_tokugawa_shimotsuke_1637_1651', officerIds: ['off_imagawa_naofusa'], scenarioIds: ['1637', '1651'], requireOwners: ['tokugawa'], setClanId: 'tokugawa', setDefaultProv: 'shimotsuke', setDaimyo: false },
    // 杉山吉成：津軽家臣
    { id: 'sugiyama_yoshinari_tsugaru_1637_1651', officerIds: ['off_ishida_yoshinari'], scenarioIds: ['1637', '1651'], requireOwners: ['tsugaru'], setClanId: 'tsugaru', setDefaultProv: 'tsugaru', setDaimyo: false },
    // 河野通房：長門の毛利家臣
    { id: 'kono_michifusa_mori_nagato_1637_1651', officerIds: ['off_kono_michifusa'], scenarioIds: ['1637', '1651'], requireOwners: ['mori'], setClanId: 'mori', setDefaultProv: 'nagato', setDaimyo: false },
    // 織田長政：大和の徳川家臣
    { id: 'oda_nagamasa_tokugawa_yamato_1651', officerIds: ['off_oda_nagamasa_uda'], scenarioIds: ['1651'], requireOwners: ['tokugawa'], setClanId: 'tokugawa', setDefaultProv: 'yamato', setDaimyo: false }
  );
}

// --- edo_1702_updates_20261011f: 1702 武将配置（ユーザー指定） ---
if (typeof window !== 'undefined' && window.OFFICER_AFFILIATION_RULES) {
  window.OFFICER_AFFILIATION_RULES.unshift(
    // 大岡忠相：武蔵（江戸）の徳川家臣
    { id: 'ooka_tadasuke_tokugawa_musashi_1702', officerIds: ['off_ooka_tadasuke'], scenarioIds: ['1702'], requireOwners: ['tokugawa'], setClanId: 'tokugawa', setDefaultProv: 'musashi', setDaimyo: false }
  );
}

// --- edo_1721_updates_20261011g: 1721 武将配置（ユーザー指定） ---
if (typeof window !== 'undefined' && window.OFFICER_AFFILIATION_RULES) {
  window.OFFICER_AFFILIATION_RULES.unshift(
    // 藤堂高敏：独立した藤堂家の当主（伊勢・津）
    { id: 'todo_takatoshi_daimyo_ise_1721', officerIds: ['off_jd_272'], scenarioIds: ['1721'], requireOwners: ['todo'], setClanId: 'todo', setDefaultProv: 'ise', setAssignedProv: 'ise', setDaimyo: true },
    // 榊原政邦：播磨姫路の徳川家臣
    { id: 'sakakibara_masakuni_tokugawa_harima_1721', officerIds: ['off_sakakibara_masakuni'], scenarioIds: ['1721'], requireOwners: ['tokugawa'], setClanId: 'tokugawa', setDefaultProv: 'harima', setDaimyo: false },
    // 赤松則弘（前播磨城主）：徳川家臣のまま播磨に待機
    { id: 'akamatsu_norihisa_tokugawa_harima_1721', officerIds: ['off_akamatsu_norihisa'], scenarioIds: ['1721'], requireOwners: ['tokugawa'], setClanId: 'tokugawa', setDefaultProv: 'harima', setDaimyo: false },
    // 北畠具長（前伊勢城主）：徳川家臣のまま（伊勢が藤堂領となったため徳川本拠に所在）
    { id: 'kitabatake_tomonaga_tokugawa_1721', officerIds: ['off_kitabatake_tomenaga'], scenarioIds: ['1721'], requireOwners: ['tokugawa'], setClanId: 'tokugawa', setDaimyo: false }
  );
}

// --- edo_1789_updates_20261011h: 1789 当主（ユーザー指定） ---
if (typeof window !== 'undefined' && window.OFFICER_AFFILIATION_RULES) {
  window.OFFICER_AFFILIATION_RULES.unshift(
    // 徳川宗睦：尾張徳川家当主（名古屋）
    { id: 'owari_munechika_daimyo_1789', officerIds: ['off_succ_owari_1733_132'], scenarioIds: ['1789'], requireOwners: ['owari'], setClanId: 'owari', setDefaultProv: 'owari', setAssignedProv: 'owari', setDaimyo: true },
    // 佐竹義和：佐竹家（久保田藩）当主（羽後）
    { id: 'satake_yoshimasa_daimyo_ugo_1789', officerIds: ['off_succ_satake_1775_150'], scenarioIds: ['1789'], requireOwners: ['satake'], setClanId: 'satake', setDefaultProv: 'ugo', setAssignedProv: 'ugo', setDaimyo: true },
    // 成瀬正典・今宮義透：家老として各国に残す
    { id: 'owari_naruse_karo_1789', officerIds: ['off_edo_owari_1744_114'], scenarioIds: ['1789'], requireOwners: ['owari'], setClanId: 'owari', setDefaultProv: 'owari', setDaimyo: false },
    { id: 'satake_imamiya_karo_ugo_1789', officerIds: ['off_edo_satake_1765_191'], scenarioIds: ['1789'], requireOwners: ['satake'], setClanId: 'satake', setDefaultProv: 'ugo', setDaimyo: false }
  );
}

// --- edo_1789_leaders_all_20261011i: 1789 史実当主（ユーザー指定） ---
if (typeof window !== 'undefined' && window.OFFICER_AFFILIATION_RULES) {
  window.OFFICER_AFFILIATION_RULES.unshift(
    // tsugaru：津軽信明 が当主、津軽寧親 は家臣として残す
    { id: 'tsugaru_daimyo_1789_hist', officerIds: ['off_tsugaru_nobuaki'], scenarioIds: ['1789'], requireOwners: ['tsugaru'], setClanId: 'tsugaru', setDefaultProv: 'tsugaru', setAssignedProv: 'tsugaru', setDaimyo: true },
    { id: 'tsugaru_former_leader_1789_hist', officerIds: ['off_succ_tsugaru_1765_205'], scenarioIds: ['1789'], requireOwners: ['tsugaru'], setClanId: 'tsugaru', setDefaultProv: 'tsugaru', setDaimyo: false },
    // date：伊達重村 が当主、石川宗光 は家臣として残す
    { id: 'date_daimyo_1789_hist', officerIds: ['off_date_shigemura'], scenarioIds: ['1789'], requireOwners: ['date'], setClanId: 'date', setDefaultProv: 'rikuzen', setAssignedProv: 'rikuzen', setDaimyo: true },
    { id: 'date_former_leader_1789_hist', officerIds: ['off_edo_date_1760_172'], scenarioIds: ['1789'], requireOwners: ['date'], setClanId: 'date', setDefaultProv: 'rikuzen', setDaimyo: false },
    // uesugi：上杉治広 が当主、上杉鷹山 は家臣として残す
    { id: 'uesugi_daimyo_1789_hist', officerIds: ['off_uesugi_haruhiro'], scenarioIds: ['1789'], requireOwners: ['uesugi'], setClanId: 'uesugi', setDefaultProv: 'uzen', setAssignedProv: 'uzen', setDaimyo: true },
    { id: 'uesugi_former_leader_1789_hist', officerIds: ['off_uesugi_yozan'], scenarioIds: ['1789'], requireOwners: ['uesugi'], setClanId: 'uesugi', setDefaultProv: 'uzen', setDaimyo: false },
    // ii：井伊直中 が当主、井伊直幸 は家臣として残す
    { id: 'ii_daimyo_1789_hist', officerIds: ['off_edo_ii_1766_141'], scenarioIds: ['1789'], requireOwners: ['ii'], setClanId: 'ii', setDefaultProv: 'north_omi', setAssignedProv: 'north_omi', setDaimyo: true },
    { id: 'ii_former_leader_1789_hist', officerIds: ['off_ii_naoyuki'], scenarioIds: ['1789'], requireOwners: ['ii'], setClanId: 'ii', setDefaultProv: 'north_omi', setDaimyo: false },
    // kishu：徳川治貞 が当主、徳川治宝 は家臣として残す
    { id: 'kishu_daimyo_1789_hist', officerIds: ['off_succ_kishu_1728_68'], scenarioIds: ['1789'], requireOwners: ['kishu'], setClanId: 'kishu', setDefaultProv: 'kii', setAssignedProv: 'kii', setDaimyo: true },
    { id: 'kishu_former_leader_1789_hist', officerIds: ['off_edo_kishu_1771_112'], scenarioIds: ['1789'], requireOwners: ['kishu'], setClanId: 'kishu', setDefaultProv: 'kii', setDaimyo: false },
    // okayama：池田治政 が当主、池田斉政 は家臣として残す
    { id: 'okayama_daimyo_1789_hist', officerIds: ['off_succ_okayama_1768_120'], scenarioIds: ['1789'], requireOwners: ['okayama'], setClanId: 'okayama', setDefaultProv: 'bizen', setAssignedProv: 'bizen', setDaimyo: true },
    { id: 'okayama_former_leader_1789_hist', officerIds: ['off_edo_okayama_1773_203'], scenarioIds: ['1789'], requireOwners: ['okayama'], setClanId: 'okayama', setDefaultProv: 'bizen', setDaimyo: false },
    // mori：毛利治親 が当主、毛利重就 は家臣として残す
    { id: 'mori_daimyo_1789_hist', officerIds: ['off_edo_mori_1754_176'], scenarioIds: ['1789'], requireOwners: ['mori'], setClanId: 'mori', setDefaultProv: 'nagato', setAssignedProv: 'nagato', setDaimyo: true },
    { id: 'mori_former_leader_1789_hist', officerIds: ['off_mori_shigenari'], scenarioIds: ['1789'], requireOwners: ['mori'], setClanId: 'mori', setDefaultProv: 'nagato', setDaimyo: false },
    // hachisuka：蜂須賀治昭 が当主、蜂須賀重喜 は家臣として残す
    { id: 'hachisuka_daimyo_1789_hist', officerIds: ['off_edo_hachisuka_1773_195'], scenarioIds: ['1789'], requireOwners: ['hachisuka'], setClanId: 'hachisuka', setDefaultProv: 'awa_shikoku', setAssignedProv: 'awa_shikoku', setDaimyo: true },
    { id: 'hachisuka_former_leader_1789_hist', officerIds: ['off_hachisuka_shigeyoshi'], scenarioIds: ['1789'], requireOwners: ['hachisuka'], setClanId: 'hachisuka', setDefaultProv: 'awa_shikoku', setDaimyo: false },
    // kuroda：黒田斉隆 が当主、黒田清定 は家臣として残す
    { id: 'kuroda_daimyo_1789_hist', officerIds: ['off_succ_kuroda_1777_78'], scenarioIds: ['1789'], requireOwners: ['kuroda'], setClanId: 'kuroda', setDefaultProv: 'chikuzen', setAssignedProv: 'chikuzen', setDaimyo: true },
    { id: 'kuroda_former_leader_1789_hist', officerIds: ['off_edo_kuroda_1750_209'], scenarioIds: ['1789'], requireOwners: ['kuroda'], setClanId: 'kuroda', setDefaultProv: 'chikuzen', setDaimyo: false },
    // shimazu：島津斉宣 が当主、島津重豪 は家臣として残す
    { id: 'shimazu_daimyo_1789_hist', officerIds: ['off_shimazu_narinobu'], scenarioIds: ['1789'], requireOwners: ['shimazu'], setClanId: 'shimazu', setDefaultProv: 'satsuma', setAssignedProv: 'satsuma', setDaimyo: true },
    { id: 'shimazu_former_leader_1789_hist', officerIds: ['off_shimazu_shigehide'], scenarioIds: ['1789'], requireOwners: ['shimazu'], setClanId: 'shimazu', setDefaultProv: 'satsuma', setDaimyo: false },
    // so：宗義功 が当主、宗義質 は家臣として残す
    { id: 'so_daimyo_1789_hist', officerIds: ['off_succ_so_1755_183'], scenarioIds: ['1789'], requireOwners: ['so'], setClanId: 'so', setDefaultProv: 'tsushima', setAssignedProv: 'tsushima', setDaimyo: true },
    { id: 'so_former_leader_1789_hist', officerIds: ['off_edo_so_1773_202'], scenarioIds: ['1789'], requireOwners: ['so'], setClanId: 'so', setDefaultProv: 'tsushima', setDaimyo: false },
    // ito：伊東祐鐘 が当主、伊東祐福 は家臣として残す
    { id: 'ito_daimyo_1789_hist', officerIds: ['off_ito_sukeatsu'], scenarioIds: ['1789'], requireOwners: ['ito'], setClanId: 'ito', setDefaultProv: 'hyuga', setAssignedProv: 'hyuga', setDaimyo: true },
    { id: 'ito_former_leader_1789_hist', officerIds: ['off_edo_ito_sukeyoshi_1789'], scenarioIds: ['1789'], requireOwners: ['ito'], setClanId: 'ito', setDefaultProv: 'hyuga', setDaimyo: false }
  );
}

// --- edo_sagami_okubo_20261011j: 江戸期の相模城主＝小田原大久保家当主（ユーザー指定） ---
if (typeof window !== 'undefined' && window.OFFICER_AFFILIATION_RULES) {
  window.OFFICER_AFFILIATION_RULES.unshift(
    // 大久保忠職（忠隣改易後〜1670）
    { id: 'okubo_sagami_head_off_okubo_tadamoto_1615', officerIds: ['off_okubo_tadamoto'], fromYear: 1615, toYear: 1670, requireOwners: ['tokugawa'], setClanId: 'tokugawa', setDefaultProv: 'sagami', setDaimyo: false },
    // 大久保忠朝（1670〜1698）
    { id: 'okubo_sagami_head_off_jd_078_1670', officerIds: ['off_jd_078'], fromYear: 1670, toYear: 1698, requireOwners: ['tokugawa'], setClanId: 'tokugawa', setDefaultProv: 'sagami', setDaimyo: false },
    // 大久保忠増（1698〜1713）
    { id: 'okubo_sagami_head_off_okubo_tadamasu_1698', officerIds: ['off_okubo_tadamasu'], fromYear: 1698, toYear: 1713, requireOwners: ['tokugawa'], setClanId: 'tokugawa', setDefaultProv: 'sagami', setDaimyo: false },
    // 大久保忠方（1713〜1732）
    { id: 'okubo_sagami_head_off_okubo_tadakata_1713', officerIds: ['off_okubo_tadakata'], fromYear: 1713, toYear: 1732, requireOwners: ['tokugawa'], setClanId: 'tokugawa', setDefaultProv: 'sagami', setDaimyo: false },
    // 大久保忠興（1732〜1763）
    { id: 'okubo_sagami_head_off_okubo_tadaoki_1732', officerIds: ['off_okubo_tadaoki'], fromYear: 1732, toYear: 1763, requireOwners: ['tokugawa'], setClanId: 'tokugawa', setDefaultProv: 'sagami', setDaimyo: false },
    // 大久保忠由（1763〜1769）
    { id: 'okubo_sagami_head_off_okubo_tadayoshi_1763', officerIds: ['off_okubo_tadayoshi'], fromYear: 1763, toYear: 1769, requireOwners: ['tokugawa'], setClanId: 'tokugawa', setDefaultProv: 'sagami', setDaimyo: false },
    // 大久保忠顕（1769〜1796）
    { id: 'okubo_sagami_head_off_okubo_tadaaki_1769', officerIds: ['off_okubo_tadaaki'], fromYear: 1769, toYear: 1796, requireOwners: ['tokugawa'], setClanId: 'tokugawa', setDefaultProv: 'sagami', setDaimyo: false },
    // 大久保忠真（1796〜1837）
    { id: 'okubo_sagami_head_off_okubo_tadatomo_line2_1796', officerIds: ['off_okubo_tadatomo_line2'], fromYear: 1796, toYear: 1837, requireOwners: ['tokugawa'], setClanId: 'tokugawa', setDefaultProv: 'sagami', setDaimyo: false },
    // 大久保忠愨（1837〜1859）
    { id: 'okubo_sagami_head_off_okubo_tadanao_1837', officerIds: ['off_okubo_tadanao'], fromYear: 1837, toYear: 1859, requireOwners: ['tokugawa'], setClanId: 'tokugawa', setDefaultProv: 'sagami', setDaimyo: false },
    // 大久保忠礼（1859〜1868）
    { id: 'okubo_sagami_head_off_okubo_tadanori_bakumatsu_1859', officerIds: ['off_okubo_tadanori_bakumatsu'], fromYear: 1859, toYear: 1868, requireOwners: ['tokugawa'], setClanId: 'tokugawa', setDefaultProv: 'sagami', setDaimyo: false },
    // 浦賀奉行ら（相模ゆかり）：前進プレイで大久保当主の空位を埋めた後に城主を返上させるため、開始年以外の 1838〜1859 のみ武蔵
    { id: 'uraga_bugyo_musashi_1838_1859', officerIds: ['off_edo_tokugawa_1778_28', 'off_edo_tokugawa_1804_30', 'off_edo_tokugawa_1799_29'], years: [1838, 1839, 1840, 1841, 1842, 1843, 1844, 1845, 1846, 1847, 1848, 1849, 1850, 1851, 1852, 1854, 1855, 1856, 1857, 1858, 1859], requireOwners: ['tokugawa'], setClanId: 'tokugawa', setDefaultProv: 'musashi', setDaimyo: false }
  );
}

// --- bakumatsu_1853plus_tohoku_moves_20261011k: 1853以降 武将配置（ユーザー指定） ---
if (typeof window !== 'undefined' && window.OFFICER_AFFILIATION_RULES) {
  window.OFFICER_AFFILIATION_RULES.unshift(
    // 楢山佐渡：陸中→陸前（陸前は伊達家本拠のため伊達家臣として）
    { id: 'narayama_sado_date_rikuzen_1853plus', officerIds: ['off_narayama_sado'], scenarioIds: ['1853', '1860', '1868'], requireOwners: ['date'], setClanId: 'date', setDefaultProv: 'rikuzen', setDaimyo: false },
    // 八戸隆吉：陸中→陸奥（南部家臣のまま）
    { id: 'hachinohe_takayoshi_nanbu_mutsu_1853plus', officerIds: ['off_edo_nanbu_1805_189'], scenarioIds: ['1853', '1860'], requireOwners: ['nanbu'], setClanId: 'nanbu', setDefaultProv: 'mutsu', setDaimyo: false },
    // 南部利済：陸奥→陸中（南部家臣のまま・隠居）
    { id: 'nanbu_toshitada_nanbu_rikuchu_1853', officerIds: ['off_edo_nanbu_1797_187'], scenarioIds: ['1853'], requireOwners: ['nanbu'], setClanId: 'nanbu', setDefaultProv: 'rikuchu', setDaimyo: false },
    // 北小路随光：陸奥→山城（公家。山城に朝廷勢力が無いため浪人として京に）
    { id: 'kitakoji_yorimitsu_ronin_yamashiro_1853plus', officerIds: ['off_jd_431'], scenarioIds: ['1853', '1860', '1866'], setClanId: 'ronin', setDefaultProv: 'yamashiro', setDaimyo: false }
  );
}

// --- edo_capitals_1866_fixes_20261011l: 1866 本拠修正に伴う配置（ユーザー指定） ---
if (typeof window !== 'undefined' && window.OFFICER_AFFILIATION_RULES) {
  window.OFFICER_AFFILIATION_RULES.unshift(
    // 前田慶寧：前田家当主として加賀（金沢）に
    { id: 'maeda_yoshiyasu_daimyo_kaga_1866', officerIds: ['off_dm_maeda_1868'], scenarioIds: ['1866'], requireOwners: ['maeda'], setClanId: 'maeda', setDefaultProv: 'kaga', setAssignedProv: 'kaga', setDaimyo: true },
    // 前田斉泰：家臣として加賀
    { id: 'maeda_nariyasu_kaga_1866', officerIds: ['off_maeda_nariyasu'], scenarioIds: ['1866'], requireOwners: ['maeda'], setClanId: 'maeda', setDefaultProv: 'kaga', setDaimyo: false },
    // 徳川慶喜：徳川家当主として武蔵（江戸）に
    { id: 'tokugawa_yoshinobu_daimyo_musashi_1866', officerIds: ['off_tokugawa_yoshinobu'], scenarioIds: ['1866'], requireOwners: ['tokugawa'], setClanId: 'tokugawa', setDefaultProv: 'musashi', setAssignedProv: 'musashi', setDaimyo: true },
    // 太田資始：下野→武蔵（徳川家臣）
    { id: 'ota_sukemoto_tokugawa_musashi_1866', officerIds: ['off_edo_tokugawa_1799_36'], scenarioIds: ['1866'], requireOwners: ['tokugawa'], setClanId: 'tokugawa', setDefaultProv: 'musashi', setDaimyo: false },
    // 藤堂高猷：下野→伊賀（伊賀は桑名藩松平家の領国。城主の藤堂長邦と同じく桑名家臣として）
    // 北小路随光：山城の徳川家臣（城主にはせず配下待機中）。1853plus の浪人ルールより優先
    { id: 'kitakoji_yorimitsu_tokugawa_yamashiro_1853plus', officerIds: ['off_jd_431'], scenarioIds: ['1853', '1860', '1866'], requireOwners: ['tokugawa'], setClanId: 'tokugawa', setDefaultProv: 'yamashiro', setDaimyo: false, clearAssignment: true },
    { id: 'todo_takayuki_kuwana_iga_1866', officerIds: ['off_edo_tokugawa_1813_34'], scenarioIds: ['1866'], requireOwners: ['kuwana'], setClanId: 'kuwana', setDefaultProv: 'iga', setDaimyo: false }
  );
}

// --- edo_1614plus_user_updates_20261011: 1614年以降の武将配置（ユーザー指定） ---
if (typeof window !== 'undefined' && window.OFFICER_AFFILIATION_RULES) {
  window.OFFICER_AFFILIATION_RULES.unshift(
    // 長尾景広・長尾景利：米沢（羽前）の上杉家臣
    { id: 'nagao_kagehiro_kagetoshi_uesugi_uzen_1614plus', officerIds: ['off_nagao_kagehiro', 'off_nagao_kagetoshi'], setClanId: 'uesugi', fromYear: 1614, requireOwners: ['uesugi'], setDefaultProv: 'uzen', setDaimyo: false },
    // 尼子元知：長門の毛利家臣
    { id: 'amago_mototomo_mori_nagato_1614plus', officerIds: ['off_amago_mototomo'], setClanId: 'mori', fromYear: 1614, requireOwners: ['mori'], setDefaultProv: 'nagato', setDaimyo: false },
    // 赤松則英：阿波の浪人
    { id: 'akamatsu_norihide_ronin_awa_1614plus', officerIds: ['off_akamatsu_norihide'], setClanId: 'ronin', fromYear: 1614, setDefaultProv: 'awa_shikoku', clearAssignment: true, setDaimyo: false },
    // 中川秀成：徳川家臣（豊後岡）
    { id: 'nakagawa_hidemasa_tokugawa_1614plus', officerIds: ['off_nakagawa_hidemasa'], setClanId: 'tokugawa', fromYear: 1614, requireOwners: ['tokugawa'], setDefaultProv: 'bungo', setDaimyo: false }
  );
}

// --- daidoji_kozuke_1570_1577_20261011ag: 1570・1573・1576・1577 上野を上杉領（1573 は元から）とし、大道寺政繁を武蔵の後北条家臣に（城主にしない）。上野城主は上杉憲政（1570）・甘粕景持（1573・1576・1577） ---
if (typeof window !== 'undefined' && window.OFFICER_AFFILIATION_RULES) {
  window.OFFICER_AFFILIATION_RULES.unshift(
    { id: 'daidoji_hojo_musashi_1570_1577', officerIds: ['off_daidoji_masashige'], scenarioIds: ['1570', '1573', '1576', '1577'], requireOwners: ['hojo'], setClanId: 'hojo', setDefaultProv: 'musashi', clearAssignment: true, setDaimyo: false },
    { id: 'uesugi_norimasa_kozuke_1570', officerIds: ['off_dm_uesugi_1546'], scenarioIds: ['1570'], requireOwners: ['uesugi'], setClanId: 'uesugi', setDefaultProv: 'kozuke', setDaimyo: false },
    { id: 'amakasu_kagemochi_kozuke_1573_1577', officerIds: ['off_amakasu_kagemochi'], scenarioIds: ['1573', '1576', '1577'], requireOwners: ['uesugi'], setClanId: 'uesugi', setDefaultProv: 'kozuke', setDaimyo: false }
  );
}

// --- hojo_ujiteru_chiba_20261011al: 北条氏照を武蔵城主に（1555・1560・1570・1573・1587）、退いた北条綱成は武蔵の家臣。1587 千葉直重を後北条家臣・下総城主に ---
if (typeof window !== 'undefined' && window.OFFICER_AFFILIATION_RULES) {
  window.OFFICER_AFFILIATION_RULES.unshift(
    { id: 'hojo_ujiteru_musashi_lord_1555_1587', officerIds: ['off_hojo_ujiteru'], scenarioIds: ['1555', '1560', '1570', '1573', '1587'], requireOwners: ['hojo'], setClanId: 'hojo', setDefaultProv: 'musashi', setDaimyo: false },
    { id: 'hojo_tsunashige_musashi_retainer_1555_1573', officerIds: ['off_hojo_tsunashige'], scenarioIds: ['1555', '1560', '1570', '1573'], requireOwners: ['hojo'], setClanId: 'hojo', setDefaultProv: 'musashi', setDaimyo: false },
    { id: 'chiba_naoshige_hojo_shimousa_1587', officerIds: ['off_chiba_naoshige_bridge'], scenarioIds: ['1587'], requireOwners: ['hojo'], setClanId: 'hojo', setDefaultProv: 'shimousa', setDaimyo: false }
  );
}

// --- moves_1587_20261011an: 北条氏邦→武蔵の家臣、大道寺政繁→上野城主、正木頼忠→安房の里見家臣、北条氏規→伊豆城主 ---
if (typeof window !== 'undefined' && window.OFFICER_AFFILIATION_RULES) {
  window.OFFICER_AFFILIATION_RULES.unshift(
    { id: 'hojo_ujikuni_musashi_retainer_1587', officerIds: ['off_hojo_ujikuni'], scenarioIds: ['1587'], requireOwners: ['hojo'], setClanId: 'hojo', setDefaultProv: 'musashi', setDaimyo: false },
    { id: 'daidoji_kozuke_lord_1587', officerIds: ['off_daidoji_masashige'], scenarioIds: ['1587'], requireOwners: ['hojo'], setClanId: 'hojo', setDefaultProv: 'kozuke', setDaimyo: false },
    { id: 'masaki_yoritada_satomi_awa_1587', officerIds: ['off_masaki_yoritada'], scenarioIds: ['1587'], requireOwners: ['satomi'], setClanId: 'satomi', setDefaultProv: 'awa_boshu', setDaimyo: false },
    { id: 'hojo_ujinori_izu_lord_1587', officerIds: ['off_hojo_ujinori'], scenarioIds: ['1587'], requireOwners: ['hojo'], setClanId: 'hojo', setDefaultProv: 'izu', setDaimyo: false }
  );
}

// --- nagao_uesugi_1583_1599_20261011ao: 長尾家の武将（長尾景広）を 1583〜1599 年も上杉家臣に（浪人化の修正） ---
if (typeof window !== 'undefined' && window.CLAN_SERVICE_FALLBACKS) {
  window.CLAN_SERVICE_FALLBACKS.push(
    { clanIds: ['nagao'], setClanId: 'uesugi', fromYear: 1583, toYear: 1599 }
  );
}

// --- oda_hidenobu_mino_1600_20261011ap: 織田秀信を美濃（岐阜城）の城主に（石田家臣） ---
if (typeof window !== 'undefined' && window.OFFICER_AFFILIATION_RULES) {
  window.OFFICER_AFFILIATION_RULES.unshift(
    { id: 'oda_hidenobu_ishida_mino_lord_1600', officerIds: ['off_oda_hidenobu'], scenarioIds: ['1600'], requireOwners: ['ishida'], setClanId: 'ishida', setDefaultProv: 'mino', setDaimyo: false }
  );
}

// --- ouchi_kono_1614_1637_20261011ar: 周防の大内衆→陸前の伊達家臣、伊予の河野の浪人→周防の毛利家臣 ---
if (typeof window !== 'undefined' && window.OFFICER_AFFILIATION_RULES) {
  window.OFFICER_AFFILIATION_RULES.unshift(
    { id: 'ouchi_date_rikuzen_1614_1637', officerIds: ['off_ouchi_shigesada', 'off_ouchi_takehide', 'off_ouchi_yoshinaga_edo'], scenarioIds: ['1614', '1637'], requireOwners: ['date'], setClanId: 'date', setDefaultProv: 'rikuzen', setDaimyo: false },
    { id: 'kono_ronin_mori_suo_1614_1637', officerIds: ['off_kono_michiki', 'off_succ_kono_1555_74'], scenarioIds: ['1614', '1637'], requireOwners: ['mori'], setClanId: 'mori', setDefaultProv: 'suo', setDaimyo: false }
  );
}

// --- arima_hyuga_1637_20261011as: 有馬直純を日向の独立大名に、伊東祐久は日向の浪人、尼子就知→長門の毛利家臣、北畠雅教・昌教→加賀の前田家臣 ---
if (typeof window !== 'undefined' && window.OFFICER_AFFILIATION_RULES) {
  window.OFFICER_AFFILIATION_RULES.unshift(
    { id: 'arima_naozumi_daimyo_hyuga_1637', officerIds: ['off_jd_053'], scenarioIds: ['1637'], requireOwners: ['arima'], setClanId: 'arima', setDefaultProv: 'hyuga', setAssignedProv: 'hyuga', setDaimyo: true },
    { id: 'ito_ronin_hyuga_1637', officerIds: ['off_ito_sukeisa', 'off_succ2_ito_1630'], scenarioIds: ['1637'], setClanId: 'ronin', setDefaultProv: 'hyuga', clearAssignment: true, setDaimyo: false },
    { id: 'amago_naritomo_mori_nagato_1637', officerIds: ['off_amago_naritomo'], scenarioIds: ['1637'], requireOwners: ['mori'], setClanId: 'mori', setDefaultProv: 'nagato', setDaimyo: false },
    { id: 'kitabatake_maeda_kaga_1637', officerIds: ['off_kitabatake_masanori_2', 'off_kitabatake_masanori'], scenarioIds: ['1637'], requireOwners: ['maeda'], setClanId: 'maeda', setDefaultProv: 'kaga', setDaimyo: false }
  );
}

// --- sakakibara_ronin_1702_20261011au: 榊原政邦を 1702 では播磨の浪人に ---
if (typeof window !== 'undefined' && window.OFFICER_AFFILIATION_RULES) {
  window.OFFICER_AFFILIATION_RULES.unshift(
    { id: 'sakakibara_masakuni_ronin_harima_1702', officerIds: ['off_sakakibara_masakuni'], scenarioIds: ['1702'], setClanId: 'ronin', setDefaultProv: 'harima', clearAssignment: true, setDaimyo: false }
  );
}

// --- sakenobe_mogami_20261011be: 鮭延秀綱は最上家が地図にあれば最上家臣（羽前、無ければ最上の本拠） ---
if (typeof window !== 'undefined' && window.OFFICER_AFFILIATION_RULES) {
  window.OFFICER_AFFILIATION_RULES.unshift(
    { id: 'sakenobe_mogami_retainer_20261011be', officerIds: ['off_shakenobe_hidetsuna'], requireOwners: ['mogami'], setClanId: 'mogami', setDaimyo: false, keepDaimyoIfSameClan: true, placeInOwnedProv: 'uzen' }
  );
}

// --- user_scenario_updates_20261015: 陸中葛西独立・南部信直北信愛陸奥・斯波詮直浪人・千葉利胤原胤貞北条配下・里見義頼独立安房上総・正木頼忠上総・北条氏邦武蔵・北条氏規伊豆・北条氏繁下総 ---
if (typeof window !== 'undefined' && window.OFFICER_AFFILIATION_RULES) {
  window.OFFICER_AFFILIATION_RULES.unshift(
        // --- user_scenario_updates_20261015_post1614 ---
        // --- user_scenario_updates_20261015_req2 ---
    { id: 'user_scenario_updates_20261015_shinsengumi_1866', officerIds: ['off_kondo_isami', 'off_hijikata_toshizo', 'off_okita_soji', 'off_nagakura_shinpachi', 'off_saito_hajime', 'off_shimada_kai', 'off_nakajima_nobori'], scenarioIds: ['1866'], setClanId: 'tokugawa', setDefaultProv: 'yamashiro', setDaimyo: false },
    { id: 'user_scenario_updates_20261015_kasuga_1866', officerIds: ['off_kasuga_saemon'], scenarioIds: ['1866'], setClanId: 'tokugawa', setDefaultProv: 'musashi', setDaimyo: false },
    { id: 'user_scenario_updates_20261015_chiba_hara_1555', officerIds: ['off_chiba_toshitane', 'off_hara_tanesada_1546'], scenarioIds: ['1555'], setClanId: 'hojo', setDefaultProv: 'shimousa', setDaimyo: false },
    { id: 'user_scenario_updates_20261015_mimura_1555', officerIds: ['off_mimura_iechika'], scenarioIds: ['1555'], setClanId: 'mimura', setDefaultProv: 'bicchu', setDaimyo: true },
    { id: 'user_scenario_updates_20261015_matsudaira_1438', officerIds: ['off_dm_matsudaira_1467'], scenarioIds: ['1438'], setClanId: 'matsudaira', setDefaultProv: 'mikawa', setDaimyo: true },
{ id: 'user_scenario_updates_20261015_matsue_1637', officerIds: ['off_edo_matsue_1601_161'], scenarioIds: ['1637'], setClanId: 'tokugawa', setDefaultProv: 'izumo', setDaimyo: false },
    { id: 'user_scenario_updates_20261015_kuroda_1853_1860', officerIds: ['off_kuroda_nagashige'], scenarioIds: ['1853', '1860'], setClanId: 'fukuoka_kuroda', setDefaultProv: 'chikuzen', setDaimyo: false },
    { id: 'user_scenario_updates_20261015_shinsengumi_1853_1860', officerIds: ['off_shimada_kai', 'off_nakajima_nobori'], scenarioIds: ['1853', '1860'], setClanId: 'tokugawa', setDefaultProv: 'musashi', setDaimyo: false },
    { id: 'user_scenario_updates_20261015_nagao_uzen', officerIds: ['off_nagao_kagehiro', 'off_nagao_kagetoshi', 'off_nagao_kagefusa'], setClanId: 'uesugi', setDefaultProv: 'uzen', setDaimyo: false },
{ id: 'user_scenario_updates_20261015_kasai_rikuchu', officerIds: ['off_kasai_harunobu'], scenarioIds: ['1555', '1560', '1570', '1573', '1576', '1577', '1582', '1584', '1587', '1590'], setClanId: 'kasai', setDefaultProv: 'rikuchu', setDaimyo: true },
    { id: 'user_scenario_updates_20261015_kita_mutsu', officerIds: ['off_kita_nobuchika'], scenarioIds: ['1555', '1560', '1570', '1573', '1576', '1577', '1582', '1584', '1587', '1590'], setClanId: 'nanbu', setDefaultProv: 'mutsu', setDaimyo: false },
    { id: 'user_scenario_updates_20261015_nanbu_nobunao_mutsu_retainer', officerIds: ['off_dm_nanbu_1582'], scenarioIds: ['1555', '1560', '1570', '1573', '1576', '1577'], setClanId: 'nanbu', setDefaultProv: 'mutsu', setDaimyo: false },
    { id: 'user_scenario_updates_20261015_nanbu_nobunao_mutsu_daimyo', officerIds: ['off_dm_nanbu_1582'], scenarioIds: ['1582', '1584', '1587', '1590'], setClanId: 'nanbu', setDefaultProv: 'mutsu', setDaimyo: true },
    { id: 'user_scenario_updates_20261015_shiba_akinao_rikuchu', officerIds: ['off_shiba_akinao'], scenarioIds: ['1555', '1560', '1570', '1573', '1576', '1577', '1582', '1584', '1587', '1590'], setClanId: 'ronin', setDefaultProv: 'rikuchu', setDaimyo: false },
    { id: 'user_scenario_updates_20261015_chiba_hara_1573', officerIds: ['off_chiba_toshitane', 'off_hara_tanesada_1546'], scenarioIds: ['1573'], setClanId: 'hojo', setDefaultProv: 'shimousa', setDaimyo: false },
    { id: 'user_scenario_updates_20261015_satomi_yoshiyori_1576', officerIds: ['off_dm_satomi_1582'], scenarioIds: ['1576'], setClanId: 'satomi', setDefaultProv: 'awa_boshu', setDaimyo: true },
    { id: 'user_scenario_updates_20261015_satomi_yoshihiro_1576', officerIds: ['off_satomi_yoshihiro'], scenarioIds: ['1576'], setClanId: 'satomi', setDefaultProv: 'awa_boshu', setDaimyo: false },
    { id: 'user_scenario_updates_20261015_masaki_yoritada_1576', officerIds: ['off_masaki_yoritada'], scenarioIds: ['1576'], setClanId: 'satomi', setDefaultProv: 'kazusa', setDaimyo: false },
    { id: 'user_scenario_updates_20261015_hojo_ujikuni_musashi_1576_1582', officerIds: ['off_hojo_ujikuni'], scenarioIds: ['1576', '1577', '1582'], setClanId: 'hojo', setDefaultProv: 'musashi', setDaimyo: false },
    { id: 'user_scenario_updates_20261015_hojo_ujinori_izu_1576_1582', officerIds: ['off_hojo_ujinori'], scenarioIds: ['1576', '1577', '1582'], setClanId: 'hojo', setDefaultProv: 'izu', setDaimyo: false },
    { id: 'user_scenario_updates_20261015_hojo_ujishige_shimousa_1576_1577', officerIds: ['off_jd_252'], scenarioIds: ['1576', '1577'], setClanId: 'hojo', setDefaultProv: 'shimousa', setDaimyo: false }
  );
}

// --- user_shikoku_updates_20261015: 1584長宗我部元親当主・仙石秀久淡路・十河存保讃岐浪人・三好氏阿波浪人・1587豊臣秀頼摂津・浅野幸長摂津・蜂須賀家政阿波城主 ---
if (typeof window !== 'undefined' && window.OFFICER_AFFILIATION_RULES) {
  window.OFFICER_AFFILIATION_RULES.unshift(
    { id: 'user_shikoku_updates_20261015_chosokabe_motochika_1584', officerIds: ['off_chosokabe_motochika'], scenarioIds: ['1584'], setClanId: 'chosokabe', setDefaultProv: 'tosa', setDaimyo: true },
    { id: 'user_shikoku_updates_20261015_sengoku_hidehisa_1584', officerIds: ['off_sengoku_hidehisa'], scenarioIds: ['1584'], setClanId: 'toyotomi', setDefaultProv: 'awaji', setDaimyo: false },
    { id: 'user_shikoku_updates_20261015_sogo_ariyasu_1584', officerIds: ['off_sogo_ariyasu'], scenarioIds: ['1584'], setClanId: 'ronin', setDefaultProv: 'sanuki', setDaimyo: false },
    { id: 'user_shikoku_updates_20261015_miyoshi_awa_ronin_1584', officerIds: ['off_miyoshi_fusakazu', 'off_dm_miyoshi_1570', 'off_miyoshi_masayasu'], scenarioIds: ['1584'], setClanId: 'ronin', setDefaultProv: 'awa_shikoku', setDaimyo: false },
    { id: 'user_shikoku_updates_20261015_toyotomi_hideyori_1587', officerIds: ['off_dm_toyotomi_1600'], scenarioIds: ['1587'], setClanId: 'toyotomi', setDefaultProv: 'settsu', setDaimyo: false },
    { id: 'user_shikoku_updates_20261015_asano_yoshinaga_1587', officerIds: ['off_dm_asano_1600'], scenarioIds: ['1587'], setClanId: 'toyotomi', setDefaultProv: 'settsu', setDaimyo: false },
    { id: 'user_shikoku_updates_20261015_hachisuka_iemasa_1587', officerIds: ['off_hachisuka_iemasa'], scenarioIds: ['1587'], setClanId: 'toyotomi', setDefaultProv: 'awa_shikoku', setDaimyo: false }
  );
}

// --- user_1590_updates_20261015: 1590酒井忠世駿河・千葉氏下総北条配下・北条氏邦成田氏長武蔵・里見義頼安房独立・正木頼忠安房・浅野氏北近江・徳川家康駿河 ---
if (typeof window !== 'undefined' && window.OFFICER_AFFILIATION_RULES) {
  window.OFFICER_AFFILIATION_RULES.unshift(
    { id: 'user_1590_updates_20261015_satomi_yoshiyori_1590', officerIds: ['off_dm_satomi_1582'], scenarioIds: ['1590'], setClanId: 'satomi', setDefaultProv: 'awa_boshu', setDaimyo: true },
    { id: 'user_1590_updates_20261015_masaki_yoritada_1590', officerIds: ['off_masaki_yoritada'], scenarioIds: ['1590'], setClanId: 'satomi', setDefaultProv: 'awa_boshu', setDaimyo: false },
    { id: 'user_1590_updates_20261015_tokugawa_ieyasu_1590', officerIds: ['off_tokugawa_ieyasu'], scenarioIds: ['1590'], setClanId: 'tokugawa', setDefaultProv: 'suruga', setDaimyo: true },
    { id: 'user_1590_updates_20261015_sakai_tadayo_1590', officerIds: ['off_sakai_tadayo'], scenarioIds: ['1590'], setClanId: 'tokugawa', setDefaultProv: 'suruga', setDaimyo: false },
    { id: 'user_1590_updates_20261015_chiba_shimousa_1590', officerIds: ['off_chiba_naoshige_bridge', 'off_chiba_shigetane'], scenarioIds: ['1590'], setClanId: 'hojo', setDefaultProv: 'shimousa', setDaimyo: false },
    { id: 'user_1590_updates_20261015_hojo_ujikuni_narita_1590', officerIds: ['off_hojo_ujikuni', 'off_narita_ujinaga'], scenarioIds: ['1590'], setClanId: 'hojo', setDefaultProv: 'musashi', setDaimyo: false },
    { id: 'user_1590_updates_20261015_asano_north_omi_1590', officerIds: ['off_asano_nagamasa', 'off_dm_asano_1600', 'off_jd_337'], scenarioIds: ['1590'], setClanId: 'toyotomi', setDefaultProv: 'north_omi', setDaimyo: false }
  );
}

// --- pre13th_scenario_historical_fixes_20261015: 13世紀以前シナリオの各勢力・武将史実配置修正 ---
if (typeof window !== 'undefined' && window.OFFICER_AFFILIATION_RULES) {
  window.OFFICER_AFFILIATION_RULES.unshift(
    // 801
    { id: 'pre13th_scenario_historical_fixes_20261015_801_aterui', officerIds: ['off_aterui'], scenarioIds: ['801'], setClanId: 'aterui', setDefaultProv: 'rikuchu', setDaimyo: true },
    { id: 'pre13th_scenario_historical_fixes_20261015_801_more', officerIds: ['off_more'], scenarioIds: ['801'], setClanId: 'aterui', setDefaultProv: 'mutsu', setDaimyo: false },
    { id: 'pre13th_scenario_historical_fixes_20261015_801_kanmu', officerIds: ['off_kanmu_tenno'], scenarioIds: ['801'], setClanId: 'heian_court', setDefaultProv: 'yamashiro', setDaimyo: true },
    { id: 'pre13th_scenario_historical_fixes_20261015_801_tamuramaro', officerIds: ['off_sakanoue_tamuramaro'], scenarioIds: ['801'], setClanId: 'heian_court', setDefaultProv: 'yamashiro', setDaimyo: false },
    
    // 1019 & 1028
    { id: 'pre13th_scenario_historical_fixes_20261015_1019_1028_tadatsune', officerIds: ['off_taira_tadanetsune'], scenarioIds: ['1019', '1028'], setClanId: 'taira_tadatsune', setDefaultProv: 'kazusa', setDaimyo: true },
    { id: 'pre13th_scenario_historical_fixes_20261015_1019_1028_tsuneharu', officerIds: ['off_taira_tsuneharu'], scenarioIds: ['1019', '1028'], setClanId: 'taira_tadatsune', setDefaultProv: 'awa_boshu', setDaimyo: false },
    { id: 'pre13th_scenario_historical_fixes_20261015_1028_tsunemasa', officerIds: ['off_taira_tsunemasa'], scenarioIds: ['1028'], setClanId: 'taira_tadatsune', setDefaultProv: 'shimousa', setDaimyo: false },
    { id: 'pre13th_scenario_historical_fixes_20261015_1019_1028_yorinobu', officerIds: ['off_minamoto_yorinobu_1028'], scenarioIds: ['1019', '1028'], setClanId: 'minamoto_tsunemoto', setDefaultProv: 'kawachi', setDaimyo: true },
    { id: 'pre13th_scenario_historical_fixes_20261015_1019_1028_naokata', officerIds: ['off_taira_naokata'], scenarioIds: ['1019', '1028'], setClanId: 'taira_sadamori', setDefaultProv: 'hitachi', setDaimyo: true },
    { id: 'pre13th_scenario_historical_fixes_20261015_1019_takaie', officerIds: ['off_fujiwara_takaie_daimyo'], scenarioIds: ['1019'], setClanId: 'heian_court', setDefaultProv: 'chikuzen', setDaimyo: false },
    { id: 'pre13th_scenario_historical_fixes_20261015_1028_yorimichi', officerIds: ['off_fujiwara_yorimichi_1028'], scenarioIds: ['1028'], setClanId: 'heian_court', setDefaultProv: 'yamashiro', setDaimyo: true },

    // 1056 前九年
    { id: 'pre13th_scenario_historical_fixes_20261015_1056_tsunekiyo', officerIds: ['off_fujiwara_tsunekiyo'], scenarioIds: ['1056'], setClanId: 'abe', setDefaultProv: 'iwaki', setDaimyo: false },
    { id: 'pre13th_scenario_historical_fixes_20261015_1056_yoriyoshi', officerIds: ['off_minamoto_yoriyoshi'], scenarioIds: ['1056'], setClanId: 'minamoto_tsunemoto', setDefaultProv: 'rikuzen', setDaimyo: true },
    { id: 'pre13th_scenario_historical_fixes_20261015_1056_yohiko', officerIds: ['off_yohiko_hidetake'], scenarioIds: ['1056'], setClanId: 'kiyohara', setDefaultProv: 'ugo', setDaimyo: false },

    // 1087 後三年
    { id: 'pre13th_scenario_historical_fixes_20261015_1087_yoshiie', officerIds: ['off_minamoto_yoshiie'], scenarioIds: ['1087'], setClanId: 'minamoto_tsunemoto', setDefaultProv: 'rikuzen', setDaimyo: true },
    { id: 'pre13th_scenario_historical_fixes_20261015_1087_kiyohira', officerIds: ['off_fujiwara_kiyohira'], scenarioIds: ['1087'], setClanId: 'kiyohara', setDefaultProv: 'rikuchu', setDaimyo: true },
    { id: 'pre13th_scenario_historical_fixes_20261015_1087_yohiko', officerIds: ['off_yohiko_hidetake'], scenarioIds: ['1087'], setClanId: 'kiyohara', setDefaultProv: 'rikuchu', setDaimyo: false },
    { id: 'pre13th_scenario_historical_fixes_20261015_1087_iehira', officerIds: ['off_kiyohara_iehira'], scenarioIds: ['1087'], setClanId: 'kiyohara_iehira', setDefaultProv: 'uzen', setDaimyo: true },

    // 1156 保元
    { id: 'pre13th_scenario_historical_fixes_20261015_1156_tametomo', officerIds: ['off_minamoto_tametomo'], scenarioIds: ['1156'], setClanId: 'sutoku_in', setDefaultProv: 'yamato', setDaimyo: false },

    // 1180-1184 治承・寿永・一ノ谷 坂東武士団
    { id: 'pre13th_scenario_historical_fixes_20261015_1180_1184_bando', officerIds: ['off_hojo_tokimasa', 'off_chiba_tsunetane', 'off_chiba_tanemasa', 'off_chiba_shigeta', 'off_kajiwara_kagetoki', 'off_kumagai_naozane', 'off_koyama_tomomasa'], scenarioIds: ['1180', '1183', '1184'], setClanId: 'genji_yoritomo', setDaimyo: false },
    { id: 'pre13th_scenario_historical_fixes_20261015_1180_1183_kazusa', officerIds: ['off_kazusa_hirotsune'], scenarioIds: ['1180', '1183'], setClanId: 'genji_yoritomo', setDefaultProv: 'kazusa', setDaimyo: false },
    { id: 'pre13th_scenario_historical_fixes_20261015_1180_miura_aki', officerIds: ['off_miura_yoshiaki'], scenarioIds: ['1180'], setClanId: 'genji_yoritomo', setDefaultProv: 'sagami', setDaimyo: false },
    { id: 'pre13th_scenario_historical_fixes_20261015_1184_nasu', officerIds: ['off_nasu_no_yoichi'], scenarioIds: ['1184'], setClanId: 'genji_yoritomo', setDefaultProv: 'shimotsuke', setDaimyo: false },

    // 1185 壇ノ浦 義経軍独立
    { id: 'pre13th_scenario_historical_fixes_20261015_1185_yoshitsune', officerIds: ['off_minamoto_yoshitsune'], scenarioIds: ['1185'], setClanId: 'genji_yoshitsune', setDefaultProv: 'aki', setDaimyo: true },
    { id: 'pre13th_scenario_historical_fixes_20261015_1185_benkei', officerIds: ['off_musashibo_benkei', 'off_sato_tadanobu'], scenarioIds: ['1185'], setClanId: 'genji_yoshitsune', setDefaultProv: 'aki', setDaimyo: false },
    { id: 'pre13th_scenario_historical_fixes_20261015_1185_tsugunobu', officerIds: ['off_sato_tsugunobu'], scenarioIds: ['1185'], setClanId: 'genji_yoshitsune', setDefaultProv: 'sanuki', setDaimyo: false },
    { id: 'pre13th_scenario_historical_fixes_20261015_1185_taguchi', officerIds: ['off_taguchi_shigeyoshi'], scenarioIds: ['1185'], setClanId: 'genji_yoshitsune', setDefaultProv: 'awa_shikoku', setDaimyo: false },
    { id: 'pre13th_scenario_historical_fixes_20261015_1185_yoritomo_vassals', officerIds: ['off_hojo_tokimasa', 'off_chiba_tsunetane', 'off_kajiwara_kagetoki', 'off_kumagai_naozane', 'off_nasu_no_yoichi', 'off_koyama_tomomasa', 'off_miura_yoshimura'], scenarioIds: ['1185'], setClanId: 'genji_yoritomo', setDaimyo: false },

    // 1189 義経追討
    { id: 'pre13th_scenario_historical_fixes_20261015_1189_yoshitsune_hiraizumi', officerIds: ['off_minamoto_yoshitsune', 'off_musashibo_benkei'], scenarioIds: ['1189'], setClanId: 'fujiwara_hiraizumi', setDefaultProv: 'rikuchu', setDaimyo: false },
    { id: 'pre13th_scenario_historical_fixes_20261015_1189_yoritomo_vassals', officerIds: ['off_hojo_tokimasa', 'off_chiba_tsunetane', 'off_chiba_tanemasa', 'off_kajiwara_kagetoki', 'off_kumagai_naozane', 'off_nasu_no_yoichi', 'off_utsunomiya_yoritsuna', 'off_koyama_tomomasa', 'off_miura_yoshimura'], scenarioIds: ['1189'], setClanId: 'genji_yoritomo', setDaimyo: false },

    // 1221 承久の乱 幕府首脳陣
    { id: 'pre13th_scenario_historical_fixes_20261015_1221_hojo_yoshitoki', officerIds: ['off_hojo_yoshitoki'], scenarioIds: ['1221'], setClanId: 'hojo_kamakura', setDefaultProv: 'sagami', setDaimyo: true },
    { id: 'pre13th_scenario_historical_fixes_20261015_1221_bakufu_leaders', officerIds: ['off_hojo_masako', 'off_hojo_yasutoki', 'off_hojo_tokifusa', 'off_hojo_masamura', 'off_oe_no_hiromoto', 'off_miura_yoshimura', 'off_ashikaga_yoshiuji', 'off_utsunomiya_yoritsuna', 'off_koyama_tomomasa', 'off_nasu_no_yoichi', 'off_yuki_tomomitsu', 'off_nitta_masayoshi'], scenarioIds: ['1221'], setClanId: 'hojo_kamakura', setDaimyo: false },

    // 1274 元寇 足利家時 & 九州防衛軍
    { id: 'pre13th_scenario_historical_fixes_20261015_1274_ashikaga_ietoki', officerIds: ['off_ashikaga_ietoki'], scenarioIds: ['1274'], setClanId: 'ashikaga', setDefaultProv: 'shimotsuke', setDaimyo: true },
    { id: 'pre13th_scenario_historical_fixes_20261015_1274_takezaki_kikuchi', officerIds: ['off_takezaki_suenaga', 'off_kikuchi_takefusa'], scenarioIds: ['1274'], setClanId: 'hojo_kamakura', setDefaultProv: 'higo', setDaimyo: false },
    { id: 'pre13th_scenario_historical_fixes_20261015_1274_so_sukekuni', officerIds: ['off_so_sukekuni'], scenarioIds: ['1274'], setClanId: 'shoni', setDefaultProv: 'chikuzen', setDaimyo: false },
    { id: 'pre13th_scenario_historical_fixes_20261015_1274_shimazu_hisaune', officerIds: ['off_shimazu_hisaune'], scenarioIds: ['1274'], setClanId: 'shimazu', setDefaultProv: 'satsuma', setDaimyo: false }
  );
}

// --- user_18th_century_updates_20261015: 18世紀以降の史実武将所属ルール（佐竹義処・義峯羽後、伊東祐実・祐崇日向、家茂1860将軍、大村益次郎長州、木戸孝允長州、西南戦争西郷軍） ---
if (typeof window !== 'undefined' && window.OFFICER_AFFILIATION_RULES) {
  window.OFFICER_AFFILIATION_RULES.unshift(
    { id: 'user_18th_century_updates_20261015_satake_ugo_1702', officerIds: ['off_satake_yoshisumi'], scenarioIds: ['1702'], setClanId: 'satake', setDefaultProv: 'ugo', setDaimyo: false },
    { id: 'user_18th_century_updates_20261015_ito_hyuga_1702', officerIds: ['off_ito_sukezane'], scenarioIds: ['1702'], setClanId: 'ito', setDefaultProv: 'hyuga', setDaimyo: false },
    { id: 'user_18th_century_updates_20261015_satake_ugo_1721', officerIds: ['off_satake_yoshimine'], scenarioIds: ['1721'], setClanId: 'satake', setDefaultProv: 'ugo', setDaimyo: false },
    { id: 'user_18th_century_updates_20261015_ito_hyuga_1721', officerIds: ['off_ito_suketaka'], scenarioIds: ['1721'], setClanId: 'ito', setDefaultProv: 'hyuga', setDaimyo: false },
    { id: 'user_18th_century_updates_20261015_iemochi_1860', officerIds: ['off_tokugawa_iemochi'], scenarioIds: ['1860'], setClanId: 'tokugawa', setDefaultProv: 'musashi', setDaimyo: true },
    { id: 'user_18th_century_updates_20261015_yoshinobu_1860', officerIds: ['off_tokugawa_yoshinobu'], scenarioIds: ['1860'], setClanId: 'tokugawa', setDefaultProv: 'musashi', setDaimyo: false },
    { id: 'user_18th_century_updates_20261015_omura_mori_1866_1868', officerIds: ['off_omura_masujiro'], scenarioIds: ['1866', '1868'], setClanId: 'mori', setDefaultProv: 'suo', setDaimyo: false },
    { id: 'user_18th_century_updates_20261015_kido_mori_1868', officerIds: ['off_kido_takayoshi'], scenarioIds: ['1868'], setClanId: 'mori', setDefaultProv: 'nagato', setDaimyo: false },
    { id: 'user_18th_century_updates_20261015_saigo_gun_1877', officerIds: ['off_saigo_takamori'], scenarioIds: ['1877'], setClanId: 'saigo_gun', setDefaultProv: 'satsuma', setDaimyo: true },
    { id: 'user_18th_century_updates_20261015_saigo_retainers_1877', officerIds: ['off_kirino_toshiaki', 'off_murata_shinpachi', 'off_shinohara_kunimoto', 'off_beppu_shinsuke'], scenarioIds: ['1877'], setClanId: 'saigo_gun', setDaimyo: false },
    { id: 'user_18th_century_updates_20261015_meiji_gov_1877', officerIds: ['off_yamagata_aritomo', 'off_kuroda_kiyotaka', 'off_okubo_toshimichi', 'off_oyama_iwao', 'off_dm_meiji_1868'], scenarioIds: ['1877'], setClanId: 'meiji', setDaimyo: false }
  );
}

// --- scenario_14_15_corrections_20261015: 14世紀・15世紀シナリオ史実配置修正（1331南部師行・結城宗広、1391山名満幸・氏清） ---
if (typeof window !== 'undefined' && window.OFFICER_AFFILIATION_RULES) {
  window.OFFICER_AFFILIATION_RULES.unshift(
    { id: 'scenario_14_15_corrections_20261015_nanbu_1331_daimyo', officerIds: ['off_dm_nanbu_1331'], scenarioIds: ['1331'], setClanId: 'nanbu', setDefaultProv: 'mutsu', setAssignedProv: 'mutsu', setDaimyo: true },
    { id: 'scenario_14_15_corrections_20261015_nanbu_1331_vassals', officerIds: ['off_succ2_nanbu_1285', 'off_nanbu_masanaga'], scenarioIds: ['1331'], setClanId: 'nanbu', setDefaultProv: 'mutsu', setAssignedProv: 'mutsu', setDaimyo: false },
    { id: 'scenario_14_15_corrections_20261015_yuki_munehiro_1331_1336', officerIds: ['off_yuki_munehiro'], scenarioIds: ['1331', '1336'], setClanId: 'yuki', setDefaultProv: 'iwaki', setAssignedProv: 'iwaki', setDaimyo: true },
    { id: 'scenario_14_15_corrections_20261015_yamana_mitsuyuki_1391', officerIds: ['off_yamana_mitsuyuki'], scenarioIds: ['1391'], setClanId: 'yamana', setDefaultProv: 'hoki', setAssignedProv: 'hoki', setDaimyo: false },
    { id: 'scenario_14_15_corrections_20261015_yamana_ujikiyo_1391', officerIds: ['off_yamana_ujikiyo'], scenarioIds: ['1391'], setClanId: 'yamana', setDefaultProv: 'tamba', setAssignedProv: 'tamba', setDaimyo: true }
  );
}

// --- 応仁の乱 追加武将（ui_fixed11）: 年代による所属の移り変わり ---
if (typeof window !== 'undefined' && Array.isArray(window.OFFICER_AFFILIATION_RULES)) {
  window.OFFICER_AFFILIATION_RULES.push(
    // 織田良信・織田広近・織田敏信: 斯波家臣→織田家
    {"id": "onin2_oda_off_onin2_060", "officerIds": ["off_onin2_060", "off_onin2_097", "off_onin2_133"], "setClanId": "oda", "fromYear": 1480, "requireOwners": ["oda"], "setDaimyo": false},
    // 笠原信隆: 伊豆討ち入り後は北条家臣
    {"id": "onin2_hojo_off_onin2_207", "officerIds": ["off_onin2_207"], "setClanId": "hojo", "fromYear": 1491, "requireOwners": ["hojo"], "setDaimyo": false},
    // 安田広春・高梨政盛: 長尾為景方
    {"id": "onin2_nagao_off_onin2_162", "officerIds": ["off_onin2_162", "off_onin2_199"], "setClanId": "nagao", "fromYear": 1490, "requireOwners": ["nagao"], "setDaimyo": false},
    // 筑紫満門: 少弐家→大内方へ寝返り
    {"id": "onin2_ouchi_off_onin2_107", "officerIds": ["off_onin2_107"], "setClanId": "ouchi", "fromYear": 1497, "requireOwners": ["ouchi"], "setDaimyo": false},
    // 筒井順永・古市胤栄・古市胤盛・越智家令・長田家則・鷹山頼栄・山村胤慶: 筒井家が地図にない時代は大和守護畠山家
    {"id": "onin2_hatakeyama_off_onin2_055", "officerIds": ["off_onin2_055", "off_onin2_056", "off_onin2_122", "off_onin2_135", "off_onin2_112", "off_onin2_115", "off_onin2_141"], "setClanId": "hatakeyama_bishu", "toYear": 1494, "requireOwners": ["hatakeyama_bishu"], "unlessOwner": "tsutsui", "setDaimyo": false},
    // 斎藤利藤・斎藤利安: 斎藤家
    {"id": "onin2_saito_off_onin2_029", "officerIds": ["off_onin2_029", "off_onin2_143"], "setClanId": "saito", "fromYear": 1500, "requireOwners": ["saito"], "setDaimyo": false},
    // 芥川長則: 三好家
    {"id": "onin2_miyoshi_off_onin2_152", "officerIds": ["off_onin2_152"], "setClanId": "miyoshi", "fromYear": 1500, "requireOwners": ["miyoshi"], "setDaimyo": false},
    // 浦上則景: 浦上家
    {"id": "onin2_uragami_off_onin2_173", "officerIds": ["off_onin2_173"], "setClanId": "uragami", "fromYear": 1480, "requireOwners": ["uragami"], "setDaimyo": false}
  );
}

// --- AI 勢力の個別補正（ui_fixed12）---
// 織田家は史実に比して AI 戦で早期に滅びやすいため、控えめに底上げする。補正は当主が織田信長の間だけ（requireHeadIds/Names）。AI が動かす時だけ有効（プレイヤーが織田家なら無効）。
//  startTroopMult: ゲーム開始時の全領国の兵力倍率 / startGoldBonus: 開始時の軍資金上乗せ
//  attackOddsMult: AI 合戦で攻める時の落城率倍率（上限95%） / defendOddsMult: 攻められた時、相手の落城率に掛ける倍率
//  smallClanProvinces 以下の小勢力の間は smallClanDefendOddsMult を代わりに使う（尾張一国からの立ち上がりを支える）
export const AI_CLAN_STRENGTH_BOOSTS = {
  oda: { requireHeadIds: ['off_oda_nobunaga'], requireHeadNames: ['織田信長'], startTroopMult: 1.2, startGoldBonus: 500, startRiceBonus: 500, attackOddsMult: 1.0, defendOddsMult: 0.85, smallClanProvinces: 2, smallClanDefendOddsMult: 0.6 }
};
if (typeof window !== 'undefined') window.AI_CLAN_STRENGTH_BOOSTS = AI_CLAN_STRENGTH_BOOSTS;

// --- 凡庸・無名の世継ぎ（ui_fixed12）---
// CPU 家で、開始時と違う武将が当主になった時に判定する。
//  有能: 武・政・知のどれかが capableTop 以上 → 本来の性格のまま
//  凡庸: 最高値が mediocreTop 未満かつ合計が mediocreSum 未満、または無名（自動生成の当主・生没年が推定・人物説明が bioMinChars 字未満）
//  凡庸なら内政型にし、侵攻は PASSIVE_HEIR_TUNING（敵の2.5倍の兵が無いと攻めない・出陣確率3%）。守りは通常どおり。
// 当主が指定の武将でなければ、能力・知名度に関係なく凡庸扱いにする家（織田家：信長以外の当主。信長死後に始まるシナリオも含む）
export const FORCED_MEDIOCRE_UNLESS_HEAD = { oda: { headIds: ['off_oda_nobunaga'], headNames: ['織田信長'] } };
if (typeof window !== 'undefined') window.FORCED_MEDIOCRE_UNLESS_HEAD = FORCED_MEDIOCRE_UNLESS_HEAD;
export const HEIR_TEMPERAMENT_RULE = { capableTop: 80, mediocreTop: 70, mediocreSum: 180, bioMinChars: 15 };
export const PASSIVE_HEIR_TUNING = { attackProb: 0.03, requiredRatio: 2.5, forceRatio: 0.6, minSourceTroops: 2500, coalitionBoost: 0, coalitionCap: 0.03, ignoreRice: false, allianceBonus: 0.15, frontShiftMax: 300 };
if (typeof window !== 'undefined') { window.HEIR_TEMPERAMENT_RULE = HEIR_TEMPERAMENT_RULE; window.PASSIVE_HEIR_TUNING = PASSIVE_HEIR_TUNING; }

// --- 1493 伊豆討ち入り（ui_fixed13）---
if (typeof window !== 'undefined' && Array.isArray(window.OFFICER_AFFILIATION_RULES)) {
  window.OFFICER_AFFILIATION_RULES.push(
    // 扇谷上杉家当主は上杉定正（明応3年没）。朝良はまだ養嗣子
    { id: 'uesugi_sadamasa_musashi_1493', officerIds: ['off_onin2_032'], scenarioIds: ['1493'], setClanId: 'ogigayatsu', setDefaultProv: 'musashi', setAssignedProv: 'musashi', setDaimyo: true },
    { id: 'uesugi_tomoyoshi_heir_1493', officerIds: ['off_uesugi_tomoyoshi_1495'], scenarioIds: ['1493'], setClanId: 'ogigayatsu', setDefaultProv: 'musashi', setDaimyo: false },
    // 明応の政変：細川政元が擁立した足利義澄が将軍家当主。廃された義材は越中へ逃れる
    { id: 'ashikaga_yoshizumi_yamashiro_1493', officerIds: ['off_ashikaga_yoshizumi'], scenarioIds: ['1493'], setClanId: 'ashikaga', setDefaultProv: 'yamashiro', setAssignedProv: 'yamashiro', setDaimyo: true },
    { id: 'ashikaga_yoshiki_etchu_jinbo_1493', officerIds: ['off_ashikaga_yoshitane'], scenarioIds: ['1493', '1495'], setClanId: 'jinbo', setDefaultProv: 'etchu', setDaimyo: false },
    // 伊豆を逐われた足利茶々丸は浪人
    { id: 'chachamaru_ronin_1493', officerIds: ['off_hist_1495_ashikaga_chachamaru'], scenarioIds: ['1493'], setClanId: 'ronin', setDefaultProv: 'izu', setDaimyo: false },
    // 小田原の大森藤頼・氏頼は扇谷上杉方として相模を守る
    { id: 'omori_sagami_1493', officerIds: ['off_hist_1495_omori_fujiyori', 'off_onin2_078'], scenarioIds: ['1493'], setClanId: 'ogigayatsu', setDefaultProv: 'sagami', setDaimyo: false }
  );
}

// ui_fixed13: 武将配置監査（1438/1467/1493/1495/1531/1538/1546）の明確な誤配置修正（既存ルールより優先）
if (typeof window !== "undefined" && window.OFFICER_AFFILIATION_RULES) {
  window.OFFICER_AFFILIATION_RULES.unshift(
    {"id": "audit13_off_onin2_069_1438", "officerIds": ["off_onin2_069"], "scenarioIds": ["1438"], "setClanId": "ronin", "setDefaultProv": "yamashiro", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_onin2_062_1438", "officerIds": ["off_onin2_062"], "scenarioIds": ["1438"], "setClanId": "ashikaga", "setDefaultProv": "mikawa", "setDaimyo": false, "placeInOwnedProv": "mikawa"},
    {"id": "audit13_off_onin2_038_1438", "officerIds": ["off_onin2_038"], "scenarioIds": ["1438"], "setClanId": "kamakura_fu", "setDefaultProv": "shimousa", "setDaimyo": false, "placeInOwnedProv": "shimousa"},
    {"id": "audit13_off_saito_myochin_1438", "officerIds": ["off_saito_myochin"], "scenarioIds": ["1438"], "setClanId": "toki", "setDefaultProv": "mino", "setDaimyo": false, "placeInOwnedProv": "mino"},
    {"id": "audit13_off_nagao_kagenobu_1438", "officerIds": ["off_nagao_kagenobu"], "scenarioIds": ["1438"], "setClanId": "uesugi", "setDefaultProv": "kozuke", "setDaimyo": false, "placeInOwnedProv": "kozuke"},
    {"id": "audit13_off_asakura_norikage_1438", "officerIds": ["off_asakura_norikage"], "scenarioIds": ["1438"], "setClanId": "shiba", "setDefaultProv": "echizen", "setDaimyo": false, "placeInOwnedProv": "echizen"},
    {"id": "audit13_off_uesugi_mochitomo_1438", "officerIds": ["off_uesugi_mochitomo"], "scenarioIds": ["1438"], "setClanId": "uesugi", "setDefaultProv": "sagami", "setDaimyo": false, "placeInOwnedProv": "sagami"},
    {"id": "audit13_off_onin2_035_1438", "officerIds": ["off_onin2_035"], "scenarioIds": ["1438"], "setClanId": "uesugi", "setDefaultProv": "sagami", "setDaimyo": false, "placeInOwnedProv": "sagami"},
    {"id": "audit13_off_gosamaru_1438", "officerIds": ["off_gosamaru"], "scenarioIds": ["1438"], "setClanId": "ryukyu", "setDefaultProv": "ryukyu", "setDaimyo": false, "placeInOwnedProv": "ryukyu"},
    {"id": "audit13_off_jd_369_1438", "officerIds": ["off_jd_369"], "scenarioIds": ["1438"], "setClanId": "kamakura_fu", "setDefaultProv": "sagami", "setDaimyo": false, "placeInOwnedProv": "sagami"},
    {"id": "audit13_off_jd_006_1467", "officerIds": ["off_jd_006"], "scenarioIds": ["1467"], "setClanId": "kamakura_fu", "setDefaultProv": "shimousa", "setDaimyo": false, "placeInOwnedProv": "shimousa"},
    {"id": "audit13_off_saito_myochin_1467", "officerIds": ["off_saito_myochin"], "scenarioIds": ["1467"], "setClanId": "toki", "setDefaultProv": "mino", "setDaimyo": false, "placeInOwnedProv": "mino"},
    {"id": "audit13_off_hosokawa_shigeyuki_1467", "officerIds": ["off_hosokawa_shigeyuki"], "scenarioIds": ["1467"], "setClanId": "hosokawa", "setDefaultProv": "awa_shikoku", "setDaimyo": false, "placeInOwnedProv": "awa_shikoku"},
    {"id": "audit13_off_jd_245_1467", "officerIds": ["off_jd_245"], "scenarioIds": ["1467"], "setClanId": "hosokawa", "setDefaultProv": "tamba", "setDaimyo": false, "placeInOwnedProv": "tamba"},
    {"id": "audit13_off_hist_1495_nagao_kageharu_1467", "officerIds": ["off_hist_1495_nagao_kageharu"], "scenarioIds": ["1467"], "setClanId": "uesugi", "setDefaultProv": "kozuke", "setDaimyo": false, "placeInOwnedProv": "kozuke"},
    {"id": "audit13_off_hist_1495_kujo_masamoto_1467", "officerIds": ["off_hist_1495_kujo_masamoto"], "scenarioIds": ["1467"], "setClanId": "ronin", "setDefaultProv": "yamashiro", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_hist_1495_ochi_iehide_1493", "officerIds": ["off_hist_1495_ochi_iehide"], "scenarioIds": ["1493"], "setClanId": "ronin", "setDefaultProv": "yamato", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_hist_1495_takeda_motoshige_1493", "officerIds": ["off_hist_1495_takeda_motoshige"], "scenarioIds": ["1493"], "setClanId": "ronin", "setDefaultProv": "aki", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_hist_1495_kobayakawa_takahira_1493", "officerIds": ["off_hist_1495_kobayakawa_takahira"], "scenarioIds": ["1493"], "setClanId": "ronin", "setDefaultProv": "aki", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_hist_1495_motoyama_yoi_1493", "officerIds": ["off_hist_1495_motoyama_yoi"], "scenarioIds": ["1493"], "setClanId": "ronin", "setDefaultProv": "tosa", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_hist_1495_sagara_tametsugu_1493", "officerIds": ["off_hist_1495_sagara_tametsugu"], "scenarioIds": ["1493"], "setClanId": "ronin", "setDefaultProv": "higo", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_succ_hosokawa_1450_38_1493", "officerIds": ["off_succ_hosokawa_1450_38"], "scenarioIds": ["1493"], "setClanId": "hosokawa", "setDefaultProv": "settsu", "setDaimyo": false, "placeInOwnedProv": "settsu"},
    {"id": "audit13_off_jd_246_1493", "officerIds": ["off_jd_246"], "scenarioIds": ["1493"], "setClanId": "hosokawa", "setDefaultProv": "bicchu", "setDaimyo": false, "placeInOwnedProv": "bicchu"},
    {"id": "audit13_off_ichijo_fusaie_1493", "officerIds": ["off_ichijo_fusaie"], "scenarioIds": ["1493"], "setClanId": "ronin", "setDefaultProv": "tosa", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_onin2_139_1493", "officerIds": ["off_onin2_139"], "scenarioIds": ["1493"], "setClanId": "ronin", "setDefaultProv": "aki", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_dm_chiba_1495_1493", "officerIds": ["off_dm_chiba_1495"], "scenarioIds": ["1493"], "setClanId": "ronin", "setDefaultProv": "shimousa", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_osaki_yoshikane_1495_1493", "officerIds": ["off_osaki_yoshikane_1495"], "scenarioIds": ["1493"], "setClanId": "ronin", "setDefaultProv": "rikuzen", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_uesugi_fusasada_1493", "officerIds": ["off_uesugi_fusasada"], "scenarioIds": ["1493"], "setClanId": "uesugi", "setDefaultProv": "echigo", "setDaimyo": false, "placeInOwnedProv": "echigo"},
    {"id": "audit13_off_hist_1495_ise_sadamune_1495", "officerIds": ["off_hist_1495_ise_sadamune"], "scenarioIds": ["1495"], "setClanId": "ashikaga", "setDefaultProv": "yamashiro", "setDaimyo": true},
    {"id": "audit13_off_hist_1495_ochi_iehide_1495", "officerIds": ["off_hist_1495_ochi_iehide"], "scenarioIds": ["1495"], "setClanId": "ronin", "setDefaultProv": "yamato", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_hist_1495_takeda_motoshige_1495", "officerIds": ["off_hist_1495_takeda_motoshige"], "scenarioIds": ["1495"], "setClanId": "ronin", "setDefaultProv": "aki", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_hist_1495_kobayakawa_takahira_1495", "officerIds": ["off_hist_1495_kobayakawa_takahira"], "scenarioIds": ["1495"], "setClanId": "ronin", "setDefaultProv": "aki", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_hist_1495_motoyama_yoi_1495", "officerIds": ["off_hist_1495_motoyama_yoi"], "scenarioIds": ["1495"], "setClanId": "ronin", "setDefaultProv": "tosa", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_hist_1495_sagara_tametsugu_1495", "officerIds": ["off_hist_1495_sagara_tametsugu"], "scenarioIds": ["1495"], "setClanId": "ronin", "setDefaultProv": "higo", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_hatakeyama_yoshitoyo_1495", "officerIds": ["off_hatakeyama_yoshitoyo"], "scenarioIds": ["1495"], "setClanId": "hatakeyama_soshu", "setDefaultProv": "kawachi", "setDaimyo": true},
    {"id": "audit13_off_succ_hosokawa_1450_38_1495", "officerIds": ["off_succ_hosokawa_1450_38"], "scenarioIds": ["1495"], "setClanId": "hosokawa", "setDefaultProv": "settsu", "setDaimyo": false, "placeInOwnedProv": "settsu"},
    {"id": "audit13_off_jd_246_1495", "officerIds": ["off_jd_246"], "scenarioIds": ["1495"], "setClanId": "hosokawa", "setDefaultProv": "bicchu", "setDaimyo": false, "placeInOwnedProv": "bicchu"},
    {"id": "audit13_off_ichijo_fusaie_1495", "officerIds": ["off_ichijo_fusaie"], "scenarioIds": ["1495"], "setClanId": "ronin", "setDefaultProv": "tosa", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_onin2_139_1495", "officerIds": ["off_onin2_139"], "scenarioIds": ["1495"], "setClanId": "ronin", "setDefaultProv": "aki", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_dm_chiba_1495_1495", "officerIds": ["off_dm_chiba_1495"], "scenarioIds": ["1495"], "setClanId": "ronin", "setDefaultProv": "shimousa", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_osaki_yoshikane_1495_1495", "officerIds": ["off_osaki_yoshikane_1495"], "scenarioIds": ["1495"], "setClanId": "ronin", "setDefaultProv": "rikuzen", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_onin2_059_1495", "officerIds": ["off_onin2_059"], "scenarioIds": ["1495"], "setClanId": "uesugi", "setDefaultProv": "echigo", "setDaimyo": false, "placeInOwnedProv": "echigo"},
    {"id": "audit13_off_arima_haruzumi_1531", "officerIds": ["off_arima_haruzumi"], "scenarioIds": ["1531"], "setClanId": "ronin", "setDefaultProv": "hizen", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_omura_sumisaki_1531", "officerIds": ["off_omura_sumisaki"], "scenarioIds": ["1531"], "setClanId": "ronin", "setDefaultProv": "hizen", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_hosokawa_takakuni_1531", "officerIds": ["off_hosokawa_takakuni"], "scenarioIds": ["1531"], "setClanId": "ronin", "setDefaultProv": "settsu", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_sanada_yukitaka_1531", "officerIds": ["off_sanada_yukitaka"], "scenarioIds": ["1531"], "setClanId": "ronin", "setDefaultProv": "north_shinano", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_yamamoto_kansuke_1531", "officerIds": ["off_yamamoto_kansuke"], "scenarioIds": ["1531"], "setClanId": "ronin", "setDefaultProv": "kai", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_itagaki_nobukata_1531", "officerIds": ["off_itagaki_nobukata"], "scenarioIds": ["1531"], "setClanId": "takeda", "setDefaultProv": "kai", "setDaimyo": false, "placeInOwnedProv": "kai"},
    {"id": "audit13_off_tachibana_dosetsu_1531", "officerIds": ["off_tachibana_dosetsu"], "scenarioIds": ["1531"], "setClanId": "otomo", "setDefaultProv": "bungo", "setDaimyo": false, "placeInOwnedProv": "bungo"},
    {"id": "audit13_off_ichijo_fusafuyu_1531", "officerIds": ["off_ichijo_fusafuyu"], "scenarioIds": ["1531"], "setClanId": "ronin", "setDefaultProv": "tosa", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_motoyama_shigemune_1531", "officerIds": ["off_motoyama_shigemune"], "scenarioIds": ["1531"], "setClanId": "ronin", "setDefaultProv": "tosa", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_aki_kunitayasu_1531", "officerIds": ["off_aki_kunitayasu"], "scenarioIds": ["1531"], "setClanId": "ronin", "setDefaultProv": "tosa", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_oda_masaharu_hitachi_1531", "officerIds": ["off_oda_masaharu_hitachi"], "scenarioIds": ["1531"], "setClanId": "ronin", "setDefaultProv": "hitachi", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_kimotsuki_kanetsugu_1531", "officerIds": ["off_kimotsuki_kanetsugu"], "scenarioIds": ["1531"], "setClanId": "ronin", "setDefaultProv": "osumi", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_iwaki_shigetaka_1531", "officerIds": ["off_iwaki_shigetaka"], "scenarioIds": ["1531"], "setClanId": "ronin", "setDefaultProv": "iwaki", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_aso_koretoyo_1531", "officerIds": ["off_aso_koretoyo"], "scenarioIds": ["1531"], "setClanId": "ronin", "setDefaultProv": "higo", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_kai_soun_1531", "officerIds": ["off_kai_soun"], "scenarioIds": ["1531"], "setClanId": "ronin", "setDefaultProv": "higo", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_jd_250_1531", "officerIds": ["off_jd_250"], "scenarioIds": ["1531"], "setClanId": "ronin", "setDefaultProv": "hoki", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_jd_421_1531", "officerIds": ["off_jd_421"], "scenarioIds": ["1531"], "setClanId": "ouchi", "setDefaultProv": "aki", "setDaimyo": false, "placeInOwnedProv": "aki"},
    {"id": "audit13_off_toki_yorinari_1531", "officerIds": ["off_toki_yorinari"], "scenarioIds": ["1531"], "setClanId": "ronin", "setDefaultProv": "mino", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_osaki_yoshinao_1538_1531", "officerIds": ["off_osaki_yoshinao_1538"], "scenarioIds": ["1531"], "setClanId": "ronin", "setDefaultProv": "rikuzen", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_hist_1495_nasu_sukefusa_1531", "officerIds": ["off_hist_1495_nasu_sukefusa"], "scenarioIds": ["1531"], "setClanId": "ronin", "setDefaultProv": "shimotsuke", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_jd_254_1531", "officerIds": ["off_jd_254"], "scenarioIds": ["1531"], "setClanId": "ronin", "setDefaultProv": "kawachi", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_oki_tamekiyo_1531", "officerIds": ["off_oki_tamekiyo"], "scenarioIds": ["1531"], "setClanId": "amago", "setDefaultProv": "oki", "setDaimyo": false, "placeInOwnedProv": "oki"},
    {"id": "audit13_off_dm_date_1546_1531", "officerIds": ["off_dm_date_1546"], "scenarioIds": ["1531"], "setClanId": "date", "setDefaultProv": "iwashiro", "setDaimyo": false, "placeInOwnedProv": "iwashiro"},
    {"id": "audit13_off_arima_haruzumi_1538", "officerIds": ["off_arima_haruzumi"], "scenarioIds": ["1538"], "setClanId": "ronin", "setDefaultProv": "hizen", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_omura_sumisaki_1538", "officerIds": ["off_omura_sumisaki"], "scenarioIds": ["1538"], "setClanId": "ronin", "setDefaultProv": "hizen", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_sanada_yukitaka_1538", "officerIds": ["off_sanada_yukitaka"], "scenarioIds": ["1538"], "setClanId": "ronin", "setDefaultProv": "kozuke", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_yamamoto_kansuke_1538", "officerIds": ["off_yamamoto_kansuke"], "scenarioIds": ["1538"], "setClanId": "ronin", "setDefaultProv": "kai", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_itagaki_nobukata_1538", "officerIds": ["off_itagaki_nobukata"], "scenarioIds": ["1538"], "setClanId": "takeda", "setDefaultProv": "kai", "setDaimyo": false, "placeInOwnedProv": "kai"},
    {"id": "audit13_off_tachibana_dosetsu_1538", "officerIds": ["off_tachibana_dosetsu"], "scenarioIds": ["1538"], "setClanId": "otomo", "setDefaultProv": "bungo", "setDaimyo": false, "placeInOwnedProv": "bungo"},
    {"id": "audit13_off_ichijo_fusafuyu_1538", "officerIds": ["off_ichijo_fusafuyu"], "scenarioIds": ["1538"], "setClanId": "ronin", "setDefaultProv": "tosa", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_motoyama_shigemune_1538", "officerIds": ["off_motoyama_shigemune"], "scenarioIds": ["1538"], "setClanId": "ronin", "setDefaultProv": "tosa", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_aki_kunitayasu_1538", "officerIds": ["off_aki_kunitayasu"], "scenarioIds": ["1538"], "setClanId": "ronin", "setDefaultProv": "tosa", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_oda_masaharu_hitachi_1538", "officerIds": ["off_oda_masaharu_hitachi"], "scenarioIds": ["1538"], "setClanId": "ronin", "setDefaultProv": "hitachi", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_kimotsuki_kanetsugu_1538", "officerIds": ["off_kimotsuki_kanetsugu"], "scenarioIds": ["1538"], "setClanId": "ronin", "setDefaultProv": "osumi", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_iwaki_shigetaka_1538", "officerIds": ["off_iwaki_shigetaka"], "scenarioIds": ["1538"], "setClanId": "ronin", "setDefaultProv": "iwaki", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_aso_koretoyo_1538", "officerIds": ["off_aso_koretoyo"], "scenarioIds": ["1538"], "setClanId": "ronin", "setDefaultProv": "higo", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_kai_soun_1538", "officerIds": ["off_kai_soun"], "scenarioIds": ["1538"], "setClanId": "ronin", "setDefaultProv": "higo", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_jd_250_1538", "officerIds": ["off_jd_250"], "scenarioIds": ["1538"], "setClanId": "ronin", "setDefaultProv": "hoki", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_jd_421_1538", "officerIds": ["off_jd_421"], "scenarioIds": ["1538"], "setClanId": "ouchi", "setDefaultProv": "aki", "setDaimyo": false, "placeInOwnedProv": "aki"},
    {"id": "audit13_off_toki_yorinari_1538", "officerIds": ["off_toki_yorinari"], "scenarioIds": ["1538"], "setClanId": "ronin", "setDefaultProv": "mino", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_osaki_yoshinao_1538_1538", "officerIds": ["off_osaki_yoshinao_1538"], "scenarioIds": ["1538"], "setClanId": "ronin", "setDefaultProv": "rikuzen", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_jd_254_1538", "officerIds": ["off_jd_254"], "scenarioIds": ["1538"], "setClanId": "ronin", "setDefaultProv": "kawachi", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_jd_019_1538", "officerIds": ["off_jd_019"], "scenarioIds": ["1538"], "setClanId": "ronin", "setDefaultProv": "awa_shikoku", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_naito_masatoyo_1538", "officerIds": ["off_naito_masatoyo"], "scenarioIds": ["1538"], "setClanId": "takeda", "setDefaultProv": "kai", "setDaimyo": false, "placeInOwnedProv": "kai"},
    {"id": "audit13_off_chiba_masatane_1538", "officerIds": ["off_chiba_masatane"], "scenarioIds": ["1538"], "setClanId": "ronin", "setDefaultProv": "shimousa", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_chiba_toshitane_1538", "officerIds": ["off_chiba_toshitane"], "scenarioIds": ["1538"], "setClanId": "ronin", "setDefaultProv": "shimousa", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_hara_tanesada_1546_1538", "officerIds": ["off_hara_tanesada_1546"], "scenarioIds": ["1538"], "setClanId": "ronin", "setDefaultProv": "shimousa", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_sue_harukata_1538", "officerIds": ["off_sue_harukata"], "scenarioIds": ["1538"], "setClanId": "ouchi", "setDefaultProv": "suo", "setDaimyo": false, "placeInOwnedProv": "suo"},
    {"id": "audit13_off_hosokawa_ujitsuna_1546", "officerIds": ["off_hosokawa_ujitsuna"], "scenarioIds": ["1546"], "setClanId": "ronin", "setDefaultProv": "settsu", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_hosokawa_harumoto_1546", "officerIds": ["off_hosokawa_harumoto"], "scenarioIds": ["1546"], "setClanId": "ronin", "setDefaultProv": "settsu", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_jd_249_1546", "officerIds": ["off_jd_249"], "scenarioIds": ["1546"], "setClanId": "ronin", "setDefaultProv": "settsu", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_ashikaga_haruuji_1546", "officerIds": ["off_ashikaga_haruuji"], "scenarioIds": ["1546"], "setClanId": "ronin", "setDefaultProv": "shimousa", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_uesugi_tomosada_1546", "officerIds": ["off_uesugi_tomosada"], "scenarioIds": ["1546"], "setClanId": "ronin", "setDefaultProv": "musashi", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_nanbata_noritsugu_1546", "officerIds": ["off_nanbata_noritsugu"], "scenarioIds": ["1546"], "setClanId": "ronin", "setDefaultProv": "musashi", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_kawajiri_hidetaka_1546", "officerIds": ["off_kawajiri_hidetaka"], "scenarioIds": ["1546"], "setClanId": "oda", "setDefaultProv": "owari", "setDaimyo": false, "placeInOwnedProv": "owari"},
    {"id": "audit13_off_miyabe_keijun_1546", "officerIds": ["off_miyabe_keijun"], "scenarioIds": ["1546"], "setClanId": "ronin", "setDefaultProv": "north_omi", "setDaimyo": false, "clearAssignment": true},
    {"id": "audit13_off_kanamori_nagachika_1546", "officerIds": ["off_kanamori_nagachika"], "scenarioIds": ["1546"], "setClanId": "oda", "setDefaultProv": "owari", "setDaimyo": false, "placeInOwnedProv": "owari"},
    {"id": "audit13_off_jd_027_1546", "officerIds": ["off_jd_027"], "scenarioIds": ["1546"], "setClanId": "oda", "setDefaultProv": "owari", "setDaimyo": false, "placeInOwnedProv": "owari"},
    {"id": "audit13_off_ikoma_chikamasa_1546", "officerIds": ["off_ikoma_chikamasa"], "scenarioIds": ["1546"], "setClanId": "oda", "setDefaultProv": "owari", "setDaimyo": false, "placeInOwnedProv": "owari"},
    {"id": "audit13_off_akechi_mitsuhide_1546", "officerIds": ["off_akechi_mitsuhide"], "scenarioIds": ["1546"], "setClanId": "saito", "setDefaultProv": "mino", "setDaimyo": false, "placeInOwnedProv": "mino"},
    {"id": "audit13_off_kosaka_masanobu_1546", "officerIds": ["off_kosaka_masanobu"], "scenarioIds": ["1546"], "setClanId": "takeda", "setDefaultProv": "kai", "setDaimyo": false, "placeInOwnedProv": "kai"},
    {"id": "audit13_off_jd_334_1546", "officerIds": ["off_jd_334"], "scenarioIds": ["1546"], "setClanId": "shimazu", "setDefaultProv": "satsuma", "setDaimyo": false, "placeInOwnedProv": "satsuma"},
    {"id": "audit13_off_jd_259_1546", "officerIds": ["off_jd_259"], "scenarioIds": ["1546"], "setClanId": "sagara", "setDefaultProv": "higo", "setDaimyo": false, "placeInOwnedProv": "higo"},
    {"id": "audit13_off_sugi_okiyoshi_1546", "officerIds": ["off_sugi_okiyoshi"], "scenarioIds": ["1546"], "setClanId": "ouchi", "setDefaultProv": "chikuzen", "setDaimyo": false, "placeInOwnedProv": "chikuzen"},
    {"id": "audit13_off_masuda_fujikane_1546", "officerIds": ["off_masuda_fujikane"], "scenarioIds": ["1546"], "setClanId": "ouchi", "setDefaultProv": "iwami", "setDaimyo": false, "placeInOwnedProv": "iwami"}
  );
}
