from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Flowable,
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "minna_de_quiz_manual.pdf"
JP_FONT = "HiraginoSansEmbedded"


class Rule(Flowable):
    def __init__(self, color=colors.HexColor("#d9d2c3"), width=1):
        super().__init__()
        self.color = color
        self.width = width

    def wrap(self, avail_width, avail_height):
        self.avail_width = avail_width
        return avail_width, 8

    def draw(self):
        self.canv.setStrokeColor(self.color)
        self.canv.setLineWidth(self.width)
        self.canv.line(0, 4, self.avail_width, 4)


def register_fonts():
    fallback = "/System/Library/Fonts/Supplemental/Arial Unicode.ttf"
    pdfmetrics.registerFont(TTFont(JP_FONT, fallback))


def build_styles():
    base = getSampleStyleSheet()
    styles = {
        "title": ParagraphStyle(
            "ManualTitle",
            parent=base["Title"],
            fontName=JP_FONT,
            fontSize=26,
            leading=34,
            textColor=colors.HexColor("#20302f"),
            alignment=TA_CENTER,
            wordWrap="CJK",
            spaceAfter=8,
        ),
        "subtitle": ParagraphStyle(
            "ManualSubtitle",
            parent=base["Normal"],
            fontName=JP_FONT,
            fontSize=12,
            leading=20,
            textColor=colors.HexColor("#61706d"),
            alignment=TA_CENTER,
            wordWrap="CJK",
            spaceAfter=18,
        ),
        "h1": ParagraphStyle(
            "ManualH1",
            parent=base["Heading1"],
            fontName=JP_FONT,
            fontSize=18,
            leading=25,
            textColor=colors.HexColor("#2c6e5b"),
            wordWrap="CJK",
            spaceBefore=10,
            spaceAfter=8,
        ),
        "h2": ParagraphStyle(
            "ManualH2",
            parent=base["Heading2"],
            fontName=JP_FONT,
            fontSize=13,
            leading=19,
            textColor=colors.HexColor("#20302f"),
            wordWrap="CJK",
            spaceBefore=8,
            spaceAfter=5,
        ),
        "body": ParagraphStyle(
            "ManualBody",
            parent=base["BodyText"],
            fontName=JP_FONT,
            fontSize=10.5,
            leading=17,
            textColor=colors.HexColor("#20302f"),
            wordWrap="CJK",
            spaceAfter=6,
        ),
        "small": ParagraphStyle(
            "ManualSmall",
            parent=base["BodyText"],
            fontName=JP_FONT,
            fontSize=9,
            leading=14,
            textColor=colors.HexColor("#61706d"),
            wordWrap="CJK",
            spaceAfter=4,
        ),
        "code": ParagraphStyle(
            "ManualCode",
            parent=base["Code"],
            fontName=JP_FONT,
            fontSize=8.5,
            leading=13,
            textColor=colors.HexColor("#20302f"),
            backColor=colors.HexColor("#f3efe5"),
            borderColor=colors.HexColor("#e3ded2"),
            borderWidth=0.5,
            borderPadding=6,
            wordWrap="CJK",
            spaceBefore=3,
            spaceAfter=8,
        ),
        "note": ParagraphStyle(
            "ManualNote",
            parent=base["BodyText"],
            fontName=JP_FONT,
            fontSize=9.5,
            leading=15,
            textColor=colors.HexColor("#245443"),
            backColor=colors.HexColor("#eef4f1"),
            borderColor=colors.HexColor("#c7dcd2"),
            borderWidth=0.5,
            borderPadding=7,
            wordWrap="CJK",
            spaceBefore=3,
            spaceAfter=8,
        ),
    }
    return styles


def p(text, styles, name="body"):
    return Paragraph(text.replace("\n", "<br/>"), styles[name])


def bullets(items, styles):
    return ListFlowable(
        [ListItem(p(item, styles), leftIndent=8) for item in items],
        bulletType="bullet",
        start="circle",
        leftIndent=16,
        bulletFontName=JP_FONT,
        bulletFontSize=7,
        bulletColor=colors.HexColor("#2c6e5b"),
    )


def numbered(items, styles):
    return ListFlowable(
        [ListItem(p(item, styles), leftIndent=8) for item in items],
        bulletType="1",
        leftIndent=18,
        bulletFontName=JP_FONT,
        bulletFontSize=9,
        bulletColor=colors.HexColor("#2c6e5b"),
    )


def table(rows, widths, styles):
    data = [[p(cell, styles, "small") for cell in row] for row in rows]
    t = Table(data, colWidths=widths, hAlign="LEFT", repeatRows=1)
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2c6e5b")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, -1), JP_FONT),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#d9d2c3")),
                ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#fffdf8")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return t


def header_footer(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setFillColor(colors.HexColor("#2c6e5b"))
    canvas.rect(0, height - 12 * mm, width, 12 * mm, fill=1, stroke=0)
    canvas.setFont(JP_FONT, 8)
    canvas.setFillColor(colors.white)
    canvas.drawString(16 * mm, height - 8 * mm, "みんなでクイズ 操作マニュアル")
    canvas.setFillColor(colors.HexColor("#61706d"))
    canvas.drawRightString(width - 16 * mm, 10 * mm, f"{doc.page}")
    canvas.restoreState()


def cover(styles):
    return [
        Spacer(1, 32 * mm),
        p("みんなでクイズ", styles, "title"),
        p("操作マニュアル", styles, "title"),
        p("豊見城3班 眞喜志運営 / リアルタイム参加型クイズWebアプリ", styles, "subtitle"),
        Spacer(1, 8 * mm),
        table(
            [
                ["項目", "内容"],
                ["対象者", "出題者、参加者、初期設定を行う担当者"],
                ["利用端末", "スマートフォン、タブレット、パソコン"],
                ["主な機能", "ルーム作成、QR参加、問題作成、回答受付、正解発表、ランキング表示"],
                ["データ同期", "Supabase Realtime。未設定時はローカル体験版として動作"],
            ],
            [36 * mm, 116 * mm],
            styles,
        ),
        Spacer(1, 8 * mm),
        p(
            "このマニュアルは、会合やイベント会場で迷わず運用できることを目的に、準備から当日の進行、困ったときの確認方法までをまとめたものです。",
            styles,
            "note",
        ),
        PageBreak(),
    ]


def build_story(styles):
    story = []
    story.extend(cover(styles))

    story += [
        p("1. アプリの概要", styles, "h1"),
        Rule(),
        p(
            "「みんなでクイズ」は、出題者と参加者がそれぞれのスマートフォンから同じクイズ大会に参加できるWebアプリです。出題者が問題表示、回答受付、正解公開、ランキング表示を操作すると、参加者画面もリアルタイムで切り替わります。",
            styles,
        ),
        bullets(
            [
                "参加者は会員登録なしで参加できます。",
                "出題者はルーム作成時に設定した管理者PINで管理画面を開きます。",
                "参加者は6桁の参加コード、またはQRコードから参加します。",
                "Supabase接続時は複数端末でリアルタイム同期します。",
            ],
            styles,
        ),
        p("2. 事前準備", styles, "h1"),
        Rule(),
        p("会場で使う前に、以下を確認してください。", styles),
        table(
            [
                ["確認項目", "内容"],
                ["インターネット接続", "出題者端末と参加者端末がインターネットに接続できることを確認します。"],
                ["ブラウザ", "Safari、Chrome、Edgeなどの新しいブラウザを使います。"],
                ["Supabase接続", "画面右上に「Supabase同期」と表示されていれば本番同期が有効です。"],
                ["参加URL", "管理画面に表示される参加用URLまたはQRコードを参加者に案内します。"],
                ["問題登録", "事前に問題作成・編集画面で問題を登録しておきます。"],
            ],
            [42 * mm, 110 * mm],
            styles,
        ),
        p("3. 出題者の使い方", styles, "h1"),
        Rule(),
        p("3.1 クイズを開催する", styles, "h2"),
        numbered(
            [
                "トップ画面で「クイズを開催する」を押します。",
                "クイズ大会名、出題者名、管理者PINを入力します。",
                "制限時間、得点、ランキング、参加人数上限などを設定します。",
                "「作成する」を押すと、6桁の参加コードが自動発行されます。",
            ],
            styles,
        ),
        p("管理者PINは4桁から6桁の数字です。参加者には教えず、出題者だけで管理してください。", styles, "note"),
        p("3.2 管理画面でできること", styles, "h2"),
        table(
            [
                ["ボタン", "使うタイミング"],
                ["問題表示", "問題文を参加者画面に表示します。まだ回答は受け付けません。"],
                ["回答受付開始", "参加者が回答できる状態にします。"],
                ["回答受付終了", "回答を締め切ります。"],
                ["正解公開", "正解、参加者の回答、獲得点数、解説を表示します。"],
                ["ランキング表示", "合計得点と正解数によるランキングを表示します。"],
                ["次の問題へ", "次の問題に進みます。"],
                ["クイズ終了", "最終ランキングとお礼画面を表示します。"],
                ["緊急停止", "進行を待機状態に戻します。操作を止めたいときに使います。"],
            ],
            [42 * mm, 110 * mm],
            styles,
        ),
        PageBreak(),
        p("4. 問題作成・編集", styles, "h1"),
        Rule(),
        p("管理画面の「問題を編集」から、問題を追加・編集できます。", styles),
        table(
            [
                ["項目", "説明"],
                ["問題文", "参加者に表示する問題です。短く見やすい文がおすすめです。"],
                ["補足説明", "必要に応じてヒントや条件を書きます。"],
                ["問題形式", "4択、2択、○×、自由記述から選びます。"],
                ["選択肢", "選択式の回答ボタンとして表示されます。"],
                ["正解", "正解判定に使います。自由記述は入力文字と一致した場合に正解です。"],
                ["正解解説", "正解発表時に表示されます。"],
                ["制限時間", "回答受付開始からの秒数です。"],
                ["得点", "正解時の基本点です。速度ボーナスが有効な場合は加点されます。"],
                ["画像URL", "画像を表示したい場合に入力します。空欄でも問題ありません。"],
                ["下書き保存", "参加者に出す前の問題として保存します。"],
            ],
            [36 * mm, 116 * mm],
            styles,
        ),
        p("問題一覧では、編集、複製、削除、ドラッグアンドドロップによる並び替えができます。", styles),
        p("5. 参加者の使い方", styles, "h1"),
        Rule(),
        numbered(
            [
                "出題者から案内されたQRコードを読み取るか、参加URLを開きます。",
                "表示名を入力して「参加する」を押します。",
                "待機画面が表示されたら、出題者が開始するまで待ちます。",
                "問題が表示され、回答受付が始まったら回答ボタンを押します。",
                "回答後は「回答を受け付けました」と表示されます。",
                "正解公開後、自分の回答、正解、不正解、獲得点数、解説を確認します。",
                "終了時は最終ランキングと自分の順位を確認します。",
            ],
            styles,
        ),
        p("同じルーム内で同じ表示名は使えません。エラーが出た場合は、名前を少し変えて参加してください。", styles, "note"),
        p("6. Supabase接続手順", styles, "h1"),
        Rule(),
        numbered(
            [
                "Supabaseでプロジェクトを作成します。Project nameは「minna-de-quiz」など英数字がおすすめです。",
                "SQL Editorを開き、プロジェクト内の「supabase/schema.sql」の中身を貼り付けてRunを押します。",
                "Project URLを確認します。例: https://oqrfhqtlhdunyjkkwcyh.supabase.co",
                "API Keys画面でPublishable keyをコピーします。sb_publishable_で始まるキーです。",
                "プロジェクト直下に「.env.local」を作り、VITE_SUPABASE_URLとVITE_SUPABASE_ANON_KEYを設定します。",
                "開発サーバーを再起動します。画面右上が「Supabase同期」になれば接続成功です。",
            ],
            styles,
        ),
        p(
            "VITE_SUPABASE_URL=https://oqrfhqtlhdunyjkkwcyh.supabase.co\nVITE_SUPABASE_ANON_KEY=sb_publishable_から始まるキー",
            styles,
            "code",
        ),
        p("Secret keyやservice_role keyはアプリに入れないでください。ブラウザ用にはPublishable keyだけを使います。", styles, "note"),
        PageBreak(),
        p("7. トップ画面の文言変更", styles, "h1"),
        Rule(),
        p("トップ画面の見出しや説明文は、以下のファイルで編集できます。", styles),
        p("src/content/homeCopy.ts", styles, "code"),
        p("現在の主な設定例は以下です。", styles),
        p(
            "eyebrow: '豊見城３班　眞喜志運営'\ntitle: 'みんなでクイズ'\ndescription: '出題者が問題を進めると、参加者の画面も同時に切り替わります。登録なしで、簡単に参加できます！'",
            styles,
            "code",
        ),
        p("保存後、ブラウザを更新すると表示が変わります。開発サーバーが動いていれば通常は自動反映されます。", styles),
        p("8. 当日の進行例", styles, "h1"),
        Rule(),
        table(
            [
                ["順番", "出題者の操作", "参加者画面"],
                ["1", "ルームを作成し、QRコードを表示", "QRコードから参加"],
                ["2", "参加者一覧で人数を確認", "待機画面"],
                ["3", "問題表示", "問題文を確認"],
                ["4", "回答受付開始", "回答ボタンを押す"],
                ["5", "回答受付終了", "正解発表を待つ"],
                ["6", "正解公開", "正解、自分の回答、点数を確認"],
                ["7", "ランキング表示または次の問題へ", "ランキング確認、または次の問題を待つ"],
                ["8", "クイズ終了", "最終順位とお礼画面"],
            ],
            [18 * mm, 56 * mm, 78 * mm],
            styles,
        ),
        p("9. 困ったとき", styles, "h1"),
        Rule(),
        table(
            [
                ["症状", "確認すること"],
                ["参加者画面が切り替わらない", "画面右上が「Supabase同期」か確認します。ローカル体験版の場合、別端末同期はできません。"],
                ["ルーム作成でエラーが出る", "SupabaseのSQLが成功しているか、Project URLとPublishable keyが正しいか確認します。"],
                ["参加コードが見つからない", "6桁の数字が正しいか、出題者が作成したルームのコードか確認します。"],
                ["同じ名前で参加できない", "同じルーム内では同じ表示名を使えません。別名に変更します。"],
                ["日本語が変に見える", "ブラウザを更新します。PDFや印刷物は日本語フォントを埋め込んだものを使用してください。"],
                ["間違えて進行した", "管理画面の「緊急停止」で待機状態に戻せます。"],
            ],
            [48 * mm, 104 * mm],
            styles,
        ),
        p("10. 安全に使うための注意", styles, "h1"),
        Rule(),
        bullets(
            [
                "管理者PINは出題者だけが知っている状態にしてください。",
                "Secret keyやservice_role keyは共有しないでください。",
                "本番公開前に、不要なテストルームやテスト回答を整理してください。",
                "会場では開始前に、出題者端末と参加者端末で1問だけテストしてください。",
            ],
            styles,
        ),
        p("以上で基本操作は完了です。楽しいクイズ会になりますように。", styles, "note"),
    ]
    return story


def main():
    register_fonts()
    styles = build_styles()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=A4,
        rightMargin=16 * mm,
        leftMargin=16 * mm,
        topMargin=20 * mm,
        bottomMargin=16 * mm,
        title="みんなでクイズ 操作マニュアル",
        author="Codex",
    )
    doc.build(build_story(styles), onFirstPage=header_footer, onLaterPages=header_footer)
    print(OUTPUT)


if __name__ == "__main__":
    main()
